import { isUniqueViolation } from '@/common/utils/db-error';
import { gameDay } from '@/common/utils/game-day';
import { WalletService } from '@/modules/wallet/service/wallet.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Attendance } from '../model/attendance.entity';
import { ATTENDANCE_REWARD } from '@/config/game.constants';
import { CoinReason } from '@/modules/wallet/model/wallet-transaction.entity';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
  ) {}

  /**
   * 출석 체크.
   */
  async checkIn(
    userId: string,
    now: Date,
  ): Promise<{ amount: number; coins: number }> {
    const day = gameDay(now);

    return this.dataSource.transaction(async (manager) => {
      try {
        await manager.getRepository(Attendance).insert({
          userId,
          day,
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new BadRequestException('오늘은 이미 출석했어요.');
        }
        throw error;
      }

      const coins = await this.walletService.earn(
        manager,
        userId,
        ATTENDANCE_REWARD,
        CoinReason.ATTENDANCE,
      );

      return { amount: ATTENDANCE_REWARD, coins };
    });
  }

  /**
   * 오늘 출석체크 했는지 조회.
   */
  async hasCheckedInToday(
    manager: EntityManager,
    userId: string,
    now: Date,
  ): Promise<boolean> {
    return manager.getRepository(Attendance).exists({
      where: { userId, day: gameDay(now) },
    });
  }

  /**
   * 조회용 진입점.
   */
  async hasCheckedInTodayForUser(userId: string, now: Date): Promise<boolean> {
    return this.hasCheckedInToday(this.dataSource.manager, userId, now);
  }
}
