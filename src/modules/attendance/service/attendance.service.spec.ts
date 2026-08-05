import { CoinReason } from '@/modules/wallet/model/wallet-transaction.entity';
import { WalletService } from '@/modules/wallet/service/wallet.service';
import { BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AttendanceService } from './attendance.service';

const USER_ID = 'user-1';

// KST 12:00 → 06:00 경계를 지났으므로 게임 하루는 '2026-08-04'.
const TODAY = new Date('2026-08-04T03:00:00Z');
const TODAY_DAY = '2026-08-04';
// 하루 전 같은 시각.
const YESTERDAY_DAY = '2026-08-03';

interface AttendanceRow {
  userId: string;
  day: string;
}

/**
 * 인메모리 출석 저장소. AttendanceService가 실제로 부르는 insert/exists만 구현한다.
 *
 * insert가 (userId, day) 중복에 23505를 던지는 것이 이 가짜의 핵심이다.
 * 중복 방어를 서비스가 아니라 유니크 제약이 한다는 것이 이 태스크의 계약이므로,
 * 가짜가 그 제약을 재현하지 않으면 "두 번째 checkIn이 막힌다"는 테스트가
 * 아무것도 검증하지 못한다.
 */
class FakeAttendanceRepository {
  rows: AttendanceRow[] = [];
  insertCalls: AttendanceRow[] = [];

  insert(row: AttendanceRow): Promise<void> {
    this.insertCalls.push({ ...row });

    const duplicated = this.rows.some(
      (r) => r.userId === row.userId && r.day === row.day,
    );
    if (duplicated) {
      // pg가 올리는 unique_violation의 최소 형태.
      return Promise.reject(
        Object.assign(
          new Error('duplicate key value violates unique constraint'),
          {
            code: '23505',
          },
        ),
      );
    }

    this.rows.push({ ...row });
    return Promise.resolve();
  }

  exists(options: { where: AttendanceRow }): Promise<boolean> {
    return Promise.resolve(
      this.rows.some(
        (r) => r.userId === options.where.userId && r.day === options.where.day,
      ),
    );
  }
}

/** earn만 쓰인다. 실패를 주입할 수 있어야 롤백 케이스를 쓸 수 있다. */
class FakeWalletService {
  calls: { userId: string; amount: number; reason: CoinReason }[] = [];
  failNext = false;

  constructor(private balance: number) {}

  earn(
    _manager: EntityManager,
    userId: string,
    amount: number,
    reason: CoinReason,
  ): Promise<number> {
    if (this.failNext) {
      return Promise.reject(new Error('wallet unavailable'));
    }

    this.calls.push({ userId, amount, reason });
    this.balance += amount;
    return Promise.resolve(this.balance);
  }
}

/**
 * transaction()과 manager만 있는 가짜 DataSource.
 *
 * 콜백이 던지면 출석 행을 시작 시점으로 되돌린다. 진짜 ROLLBACK이 아니라
 * "출석 행과 코인 적립이 같은 트랜잭션에 묶인다"는 계약만 재현한 것이다.
 * 실제 롤백 동작은 T6에서 실 DB로 확인한다.
 */
class FakeDataSource {
  readonly manager: EntityManager;

  constructor(private readonly attendance: FakeAttendanceRepository) {
    this.manager = {
      getRepository: () => attendance,
    } as unknown as EntityManager;
  }

  async transaction<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    const snapshot = this.attendance.rows.map((r) => ({ ...r }));
    try {
      return await fn(this.manager);
    } catch (err) {
      this.attendance.rows = snapshot;
      throw err;
    }
  }
}

function setup(rows: AttendanceRow[] = [], coins = 0) {
  const repo = new FakeAttendanceRepository();
  repo.rows = rows.map((r) => ({ ...r }));

  const wallet = new FakeWalletService(coins);
  const dataSource = new FakeDataSource(repo);
  const service = new AttendanceService(
    dataSource as unknown as DataSource,
    wallet as unknown as WalletService,
  );

  return { service, repo, wallet };
}

describe('AttendanceService.checkIn', () => {
  it('creates a row, grants coins, and returns the amount with the new balance', async () => {
    const { service, repo, wallet } = setup();

    await expect(service.checkIn(USER_ID, TODAY)).resolves.toEqual({
      amount: 200,
      coins: 200,
    });
    expect(repo.rows).toEqual([{ userId: USER_ID, day: TODAY_DAY }]);
    expect(wallet.calls).toEqual([
      { userId: USER_ID, amount: 200, reason: CoinReason.ATTENDANCE },
    ]);
  });

  it('rejects a second check-in on the same day and grants nothing', async () => {
    const { service, repo, wallet } = setup([
      { userId: USER_ID, day: TODAY_DAY },
    ]);

    await expect(service.checkIn(USER_ID, TODAY)).rejects.toThrow(
      BadRequestException,
    );
    expect(repo.rows).toHaveLength(1);
    expect(wallet.calls).toHaveLength(0);
  });

  it("allows a check-in when only yesterday's row exists", async () => {
    const { service, repo } = setup([{ userId: USER_ID, day: YESTERDAY_DAY }]);

    await expect(service.checkIn(USER_ID, TODAY)).resolves.toMatchObject({
      amount: 200,
    });
    expect(repo.rows).toHaveLength(2);
  });

  it('leaves no attendance row when granting coins fails', async () => {
    const { service, repo, wallet } = setup();
    wallet.failNext = true;

    await expect(service.checkIn(USER_ID, TODAY)).rejects.toThrow(
      'wallet unavailable',
    );
    expect(repo.rows).toHaveLength(0);
  });
});

describe('AttendanceService.hasCheckedInToday', () => {
  it("returns true when today's row exists", async () => {
    const { service, repo } = setup([{ userId: USER_ID, day: TODAY_DAY }]);
    const manager = new FakeDataSource(repo).manager;

    await expect(
      service.hasCheckedInToday(manager, USER_ID, TODAY),
    ).resolves.toBe(true);
  });

  it('returns false without writing when there is no row', async () => {
    const { service, repo } = setup();
    const manager = new FakeDataSource(repo).manager;

    await expect(
      service.hasCheckedInToday(manager, USER_ID, TODAY),
    ).resolves.toBe(false);
    expect(repo.insertCalls).toHaveLength(0);
  });
});
