import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  CoinReason,
  WalletTransaction,
} from '../model/wallet-transaction.entity';
import { Wallet } from '../model/wallet.entity';

@Injectable()
export class WalletService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * 코인 적립
   */
  async earn(
    manager: EntityManager,
    userId: string,
    amount: number,
    reason: CoinReason,
  ) {
    this.assertPositive(amount);

    const wallet = await this.lockWallet(manager, userId);
    wallet.coins += amount;

    await manager.getRepository(Wallet).save(wallet);
    await this.record(manager, userId, amount, wallet.coins, reason);

    return wallet.coins;
  }

  /**
   * 코인 차감
   */
  async spend(
    manager: EntityManager,
    userId: string,
    amount: number,
    reason: CoinReason,
  ) {
    this.assertPositive(amount);

    const wallet = await this.lockWallet(manager, userId);

    if (wallet.coins < amount) {
      throw new BadRequestException('코인이 부족해요.');
    }

    wallet.coins -= amount;
    await manager.getRepository(Wallet).save(wallet);
    await this.record(manager, userId, -amount, wallet.coins, reason);

    return wallet.coins;
  }

  /** 읽기 전용 잔액 조회 */
  async balance(manager: EntityManager, userId: string) {
    const wallet = await manager
      .getRepository(Wallet)
      .findOne({ where: { userId } });

    if (!wallet) throw new NotFoundException('지갑을 찾을 수 없어요.');

    return wallet.coins;
  }

  /**
   * 트랜잭션 밖에서 조회용 진입점
   */
  async balanceForUser(userId: string) {
    return this.balance(this.dataSource.manager, userId);
  }

  /**
   * 거래내역 남기기
   */
  private async record(
    manager: EntityManager,
    userId: string,
    amount: number,
    balanceAfter: number,
    reason: CoinReason,
  ) {
    await manager.getRepository(WalletTransaction).save(
      manager.getRepository(WalletTransaction).create({
        userId,
        amount,
        balanceAfter,
        reason,
      }),
    );
  }

  /**
   * 잔액을 바꾸기 전에 지갑 행을 잠근다.
   */
  private async lockWallet(manager: EntityManager, userId: string) {
    const wallet = await manager.getRepository(Wallet).findOne({
      where: { userId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!wallet) throw new NotFoundException('지갑을 찾을 수 없어요.');

    return wallet;
  }

  private assertPositive(amount: number): void {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('금액이 올바르지 않아요.');
    }
  }
}
