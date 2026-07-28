import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { Session } from '../model/session.entity';
import { SessionService } from './session.service';

const TTL_DAYS = 14;
const ABSOLUTE_TTL_DAYS = 90;
const RENEW_RATIO = 0.5;
const DAY_MS = 24 * 60 * 60 * 1000;

const CONFIG: Record<string, number> = {
  'auth.sessionTtlDays': TTL_DAYS,
  'auth.sessionAbsoluteTtlDays': ABSOLUTE_TTL_DAYS,
  'auth.sessionRenewThresholdRatio': RENEW_RATIO,
};

const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

const matches = (row: Session, where: Partial<Session>): boolean =>
  Object.entries(where).every(
    ([key, value]) =>
      (row as unknown as Record<string, unknown>)[key] === value,
  );

interface FindOneCall {
  where: { id: string };
  lock?: { mode: string };
}

interface FakeEntityManager {
  create(target: unknown, input: Partial<Session>): Session;
  save(target: unknown, row: Session): Promise<Session>;
  delete(target: unknown, where: Partial<Session>): Promise<void>;
  findOne(target: unknown, options: FindOneCall): Promise<null>;
}

/**
 * 인메모리 세션 저장소. SessionService가 실제로 호출하는 메서드만 구현한다.
 * 트랜잭션은 롤백까지 흉내내지 않는다 — 여기서 확인할 것은 createExclusive의
 * "삭제 후 삽입" 결과이지 DB 트랜잭션 자체의 동작이 아니다.
 */
class FakeSessionRepository {
  rows: Session[] = [];

  // 트랜잭션 안에서 건 잠금 요청 기록 (동시 로그인 직렬화 검증용)
  lockCalls: FindOneCall[] = [];

  create(input: Partial<Session>): Session {
    return { ...input } as Session;
  }

  // @CreateDateColumn을 흉내낸다 — 절대 상한 계산이 createdAt에 의존한다.
  save(entity: Session): Promise<Session> {
    entity.createdAt = entity.createdAt ?? new Date();
    this.rows.push(entity);
    return Promise.resolve(entity);
  }

  update(where: Partial<Session>, patch: Partial<Session>): Promise<void> {
    this.rows
      .filter((row) => matches(row, where))
      .forEach((row) => Object.assign(row, patch));
    return Promise.resolve();
  }

  findOne(options: { where: Partial<Session> }): Promise<Session | null> {
    const found = this.rows.find((row) => matches(row, options.where));
    return Promise.resolve(found ?? null);
  }

  delete(where: Partial<Session>): Promise<void> {
    this.rows = this.rows.filter((row) => !matches(row, where));
    return Promise.resolve();
  }

  readonly manager = {
    transaction: <T>(
      runInTransaction: (manager: FakeEntityManager) => Promise<T>,
    ): Promise<T> => runInTransaction(this.entityManager),
  };

  private readonly entityManager: FakeEntityManager = {
    create: (_target, input) => this.create(input),
    save: (_target, row) => this.save(row),
    delete: (_target, where) => this.delete(where),
    findOne: (_target, options) => {
      this.lockCalls.push(options);
      return Promise.resolve(null);
    },
  };
}

describe('SessionService', () => {
  let repository: FakeSessionRepository;
  let service: SessionService;

  beforeEach(() => {
    repository = new FakeSessionRepository();
    service = new SessionService(
      repository as unknown as Repository<Session>,
      { getOrThrow: (key: string) => CONFIG[key] } as unknown as ConfigService,
    );
  });

  describe('토큰 해시 저장', () => {
    it('원문 토큰을 저장하지 않고 sha256 해시만 남긴다', async () => {
      const token = await service.create('user-1');

      expect(repository.rows).toHaveLength(1);
      expect(repository.rows[0].tokenHash).toBe(sha256(token));
      expect(repository.rows[0].tokenHash).not.toBe(token);
      // 다른 컬럼에도 원문이 새지 않아야 한다
      expect(JSON.stringify(repository.rows)).not.toContain(token);
    });

    it('원문 토큰으로 세션을 찾는다', async () => {
      const token = await service.create('user-1');

      const validated = await service.findValid(token);

      expect(validated?.session.userId).toBe('user-1');
    });

    it('저장된 해시값을 그대로 제시하면 세션을 찾지 못한다', async () => {
      // DB가 유출되어 token_hash를 손에 넣어도 쿠키로 쓸 수 없어야 한다
      const token = await service.create('user-1');

      expect(await service.findValid(sha256(token))).toBeNull();
    });

    it('원문 토큰으로 세션을 삭제한다', async () => {
      const token = await service.create('user-1');

      await service.delete(token);

      expect(repository.rows).toHaveLength(0);
    });

    it('매번 다른 토큰을 발급한다', async () => {
      const first = await service.create('user-1');
      const second = await service.create('user-1');

      expect(first).not.toBe(second);
      expect(repository.rows[0].tokenHash).not.toBe(
        repository.rows[1].tokenHash,
      );
    });
  });

  describe('findValid', () => {
    it('만료된 세션은 null을 반환하고 row도 지운다', async () => {
      const token = await service.create('user-1');
      repository.rows[0].expiresAt = new Date(Date.now() - 1000);

      expect(await service.findValid(token)).toBeNull();
      expect(repository.rows).toHaveLength(0);
    });

    it('없는 토큰은 null을 반환한다', async () => {
      expect(await service.findValid('does-not-exist')).toBeNull();
    });

    it('절대 상한을 넘긴 세션은 만료 전이라도 죽는다', async () => {
      const token = await service.create('user-1');
      // 계속 활동해서 expiresAt은 미래지만, 발급 시점이 상한 밖인 상황
      repository.rows[0].createdAt = new Date(
        Date.now() - (ABSOLUTE_TTL_DAYS + 1) * DAY_MS,
      );

      expect(await service.findValid(token)).toBeNull();
      expect(repository.rows).toHaveLength(0);
    });
  });

  describe('슬라이딩 갱신', () => {
    it('남은 수명이 임계값보다 많으면 갱신하지 않는다', async () => {
      const token = await service.create('user-1');
      const before = repository.rows[0].expiresAt.getTime();

      const validated = await service.findValid(token);

      expect(validated?.renewed).toBe(false);
      expect(repository.rows[0].expiresAt.getTime()).toBe(before);
    });

    it('남은 수명이 임계값 아래로 떨어지면 만료를 민다', async () => {
      const token = await service.create('user-1');
      // 임계값(TTL의 50%)을 막 넘긴 상태로 만든다
      const stale = new Date(
        Date.now() + TTL_DAYS * RENEW_RATIO * DAY_MS - 1000,
      );
      repository.rows[0].expiresAt = stale;

      const validated = await service.findValid(token);

      expect(validated?.renewed).toBe(true);
      expect(repository.rows[0].expiresAt.getTime()).toBeGreaterThan(
        stale.getTime(),
      );
    });

    it('갱신해도 절대 상한 너머로는 밀지 않는다', async () => {
      const token = await service.create('user-1');
      const createdAt = new Date(Date.now() - (ABSOLUTE_TTL_DAYS - 1) * DAY_MS);
      repository.rows[0].createdAt = createdAt;
      repository.rows[0].expiresAt = new Date(Date.now() + 1000);

      await service.findValid(token);

      const deadline = createdAt.getTime() + ABSOLUTE_TTL_DAYS * DAY_MS;
      expect(repository.rows[0].expiresAt.getTime()).toBe(deadline);
    });
  });

  describe('createExclusive', () => {
    it('해당 유저의 기존 세션을 모두 지우고 새 세션 하나만 남긴다', async () => {
      await service.create('user-1');
      await service.create('user-1');

      const token = await service.createExclusive('user-1');

      const rows = repository.rows.filter((row) => row.userId === 'user-1');
      expect(rows).toHaveLength(1);
      expect(rows[0].tokenHash).toBe(sha256(token));
    });

    it('다른 유저의 세션은 건드리지 않는다', async () => {
      const otherToken = await service.create('user-2');

      await service.createExclusive('user-1');

      expect(await service.findValid(otherToken)).not.toBeNull();
    });

    it('유저 row에 쓰기 잠금을 걸어 동시 로그인을 직렬화한다', async () => {
      // 잠금이 없으면 동시 로그인 두 건이 서로의 INSERT를 못 보고 세션이 2개 남는다.
      // 실제 경합은 단위 테스트로 재현할 수 없으므로, 잠금 요청 자체를 고정한다.
      await service.createExclusive('user-1');

      expect(repository.lockCalls).toEqual([
        { where: { id: 'user-1' }, lock: { mode: 'pessimistic_write' } },
      ]);
    });

    it('발급된 세션의 createdAt이 새로 잡힌다', async () => {
      // 절대 상한이 재로그인으로 초기화되는지 — 이게 안 되면 재로그인해도 상한이 안 풀린다
      await service.create('user-1');
      repository.rows[0].createdAt = new Date(
        Date.now() - (ABSOLUTE_TTL_DAYS + 1) * DAY_MS,
      );

      const token = await service.createExclusive('user-1');

      expect(await service.findValid(token)).not.toBeNull();
    });
  });

  describe('세션 값', () => {
    it('클라이언트 정보를 기록한다', async () => {
      await service.create('user-1', {
        ipAddress: '203.0.113.7',
        userAgent: 'jest-agent',
      });

      expect(repository.rows[0].ipAddress).toBe('203.0.113.7');
      expect(repository.rows[0].userAgent).toBe('jest-agent');
    });

    it('클라이언트 정보가 없으면 null로 둔다', async () => {
      await service.create('user-1');

      expect(repository.rows[0].ipAddress).toBeNull();
      expect(repository.rows[0].userAgent).toBeNull();
    });

    it('설정된 TTL만큼 만료 시각을 잡는다', async () => {
      const before = Date.now();
      await service.create('user-1');

      const expected = before + TTL_DAYS * DAY_MS;
      const actual = repository.rows[0].expiresAt.getTime();

      expect(actual).toBeGreaterThanOrEqual(expected);
      expect(actual).toBeLessThan(expected + 5000);
    });
  });
});
