import { ClientInfo } from '@/common/decorators/client-info.decorator';
import { User } from '@/modules/user/model/user.entity';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { Session } from '../model/session.entity';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ValidatedSession {
  session: Session;
  // 슬라이딩 갱신으로 만료 시각이 밀렸는지. 호출측이 쿠키를 다시 내려야 하는지 판단한다.
  renewed: boolean;
}

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionModel: Repository<Session>,

    private readonly configService: ConfigService,
  ) {}

  // 토큰 생성 및 세션 저장. 반환값은 원문 토큰(쿠키용), 저장되는 것은 해시.
  async create(userId: string, clientInfo?: ClientInfo): Promise<string> {
    const { token, record } = this.build(userId, clientInfo);
    await this.sessionModel.save(this.sessionModel.create(record));

    return token;
  }

  /**
   * 단일 기기 정책. 해당 유저의 기존 세션을 모두 지우고 새 세션을 발급한다.
   *
   * 트랜잭션은 원자성을 위한 것이다 — 삭제만 성공하고 발급이 실패하면
   * 유저가 모든 기기에서 로그아웃된 채 새 세션도 없는 상태로 남는다.
   *
   * 잠금은 격리를 위한 것이다 — 트랜잭션만으로는 동시 로그인 두 건이
   * 서로의 INSERT를 보지 못한 채 각자 세션을 남겨 세션이 2개가 된다.
   *
   * 만료 row 청소도 여기서 함께 이뤄진다(userId 기준 전량 삭제이므로).
   */
  async createExclusive(
    userId: string,
    clientInfo?: ClientInfo,
  ): Promise<string> {
    const { token, record } = this.build(userId, clientInfo);

    await this.sessionModel.manager.transaction(async (manager) => {
      // 같은 유저의 로그인을 직렬화한다. 뒤늦은 요청은 앞선 요청이 커밋된 뒤에
      // 삭제를 수행하므로, 앞선 요청이 넣은 세션을 제대로 지운다.
      await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      await manager.delete(Session, { userId });
      await manager.save(Session, manager.create(Session, record));
    });

    return token;
  }

  /**
   * 세션 검증. 쿠키의 원문 토큰을 해시로 바꿔 조회한다.
   * 유효하면 슬라이딩 갱신을 시도하고, 갱신 여부를 함께 돌려준다.
   */
  async findValid(token: string): Promise<ValidatedSession | null> {
    const tokenHash = this.hash(token);
    const session = await this.sessionModel.findOne({
      where: { tokenHash },
      relations: { user: true },
    });

    if (!session) return null;

    const now = Date.now();

    // 유휴 만료 — 마지막 활동 이후 TTL이 지났다.
    if (session.expiresAt.getTime() <= now) {
      await this.sessionModel.delete({ tokenHash });
      return null;
    }

    // 절대 상한 — 계속 활동했더라도 발급 후 상한을 넘기면 재로그인.
    if (this.absoluteDeadline(session) <= now) {
      await this.sessionModel.delete({ tokenHash });
      return null;
    }

    const renewed = await this.renewIfStale(session, now);
    return { session, renewed };
  }

  // 세션 삭제
  async delete(token: string): Promise<void> {
    await this.sessionModel.delete({ tokenHash: this.hash(token) });
  }

  /**
   * 남은 수명이 TTL의 임계 비율 아래로 떨어졌을 때만 만료 시각을 민다.
   * 인증이 필요한 모든 요청이 이 경로를 타므로, 매번 UPDATE를 걸면
   * 읽기 전용이던 세션 조회가 통째로 쓰기 경로가 된다.
   */
  private async renewIfStale(session: Session, now: number): Promise<boolean> {
    const ttlMs =
      this.configService.getOrThrow<number>('auth.sessionTtlDays') * DAY_MS;
    const ratio = this.configService.getOrThrow<number>(
      'auth.sessionRenewThresholdRatio',
    );

    if (session.expiresAt.getTime() - now > ttlMs * ratio) return false;

    // 절대 상한 너머로는 밀지 않는다 — expiresAt이 실제 수명보다 길게 보이면 안 된다.
    const expiresAt = new Date(
      Math.min(now + ttlMs, this.absoluteDeadline(session)),
    );

    await this.sessionModel.update(
      { tokenHash: session.tokenHash },
      { expiresAt },
    );
    session.expiresAt = expiresAt;

    return true;
  }

  // 발급 시점 기준 절대 만료 시각
  private absoluteDeadline(session: Session): number {
    const absoluteTtlDays = this.configService.getOrThrow<number>(
      'auth.sessionAbsoluteTtlDays',
    );

    return session.createdAt.getTime() + absoluteTtlDays * DAY_MS;
  }

  /**
   * 저장 전 세션 값 조립 (create / createExclusive 공용).
   * 원문 토큰과 저장용 record를 분리해서 반환한다 — record에는 해시만 담긴다.
   */
  private build(userId: string, clientInfo?: ClientInfo) {
    const ttlDays = this.configService.getOrThrow<number>(
      'auth.sessionTtlDays',
    );
    const token = randomBytes(32).toString('hex');

    return {
      token,
      record: {
        userId,
        tokenHash: this.hash(token),
        expiresAt: new Date(Date.now() + ttlDays * DAY_MS),
        ipAddress: clientInfo?.ipAddress ?? null,
        userAgent: clientInfo?.userAgent ?? null,
      },
    };
  }

  /**
   * 토큰은 256비트 CSPRNG 난수라 추측·사전 공격 대상이 아니다.
   * 따라서 비밀번호처럼 argon2를 쓸 이유가 없고(매 요청 검증이라 오히려 해롭다),
   * 유출된 DB 값에서 원문을 되돌리지 못하게 막는 sha256이면 충분하다.
   */
  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
