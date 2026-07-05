import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { Session } from '../model/session.entity';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionModel: Repository<Session>,

    private readonly configService: ConfigService,
  ) {}

  // 토큰 생성 및 세션 저장
  async create(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const ttlDays = this.configService.getOrThrow<number>(
      'auth.sessionTtlDays',
    );
    const expiresAt = new Date(Date.now() + ttlDays * DAY_MS);

    await this.sessionModel.save(
      this.sessionModel.create({ userId, token, expiresAt }),
    );

    return token;
  }

  // 세션 검증
  async findValid(token: string): Promise<Session | null> {
    const session = await this.sessionModel.findOne({
      where: { token },
      relations: { user: true },
    });

    if (!session) return null;

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.sessionModel.delete({ token });
      return null;
    }

    return session;
  }

  // 세션 삭제
  async delete(token: string): Promise<void> {
    await this.sessionModel.delete({ token });
  }
}
