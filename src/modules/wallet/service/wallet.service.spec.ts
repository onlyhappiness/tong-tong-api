import { BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { Wallet } from '../model/wallet.entity';
import { WalletService } from './wallet.service';
import {
  CoinReason,
  WalletTransaction,
} from '../model/wallet-transaction.entity';

const USER_ID = 'user-1';

interface FindOneCall {
  where: { userId: string };
  lock?: { mode: string };
}

/**
 * 인메모리 지갑 저장소. WalletService가 실제로 호출하는 메서드만 구현한다.
 * findOne에 넘어온 옵션을 기록해 두고 잠금 여부를 테스트에서 확인한다.
 */
class FakeWalletRepository {
  findOneCalls: FindOneCall[] = [];
  saveCalls: Wallet[] = [];

  constructor(private readonly rows: Wallet[]) {}

  async findOne(options: FindOneCall): Promise<Wallet | null> {
    this.findOneCalls.push(options);
    return this.rows.find((r) => r.userId === options.where.userId) ?? null;
  }

  async save(row: Wallet): Promise<Wallet> {
    this.saveCalls.push(row);
    return row;
  }
}

/** 원장. create/save만 쓰이고 읽히지 않는다. */
class FakeLedgerRepository {
  rows: WalletTransaction[] = [];

  create(input: Partial<WalletTransaction>): WalletTransaction {
    return Object.assign(new WalletTransaction(), input);
  }

  async save(row: WalletTransaction): Promise<WalletTransaction> {
    this.rows.push(row);
    return row;
  }
}

// 엔티티 클래스로 갈라주는 최소한의 매니저. WalletService가 두 레포를 쓰기 때문에
// getRepository가 인자를 무시하면 원장 기록이 지갑 저장으로 새어 들어간다.
class FakeEntityManager {
  constructor(
    private readonly wallets: FakeWalletRepository,
    private readonly ledger: FakeLedgerRepository,
  ) {}

  getRepository(target: unknown): FakeWalletRepository | FakeLedgerRepository {
    return target === Wallet ? this.wallets : this.ledger;
  }
}

function setup(coins: number) {
  const wallet = new Wallet();
  wallet.userId = USER_ID;
  wallet.coins = coins;

  const repo = new FakeWalletRepository([wallet]);
  const ledger = new FakeLedgerRepository();
  const manager = new FakeEntityManager(
    repo,
    ledger,
  ) as unknown as EntityManager;
  // balanceForUser를 쓰지 않는 테스트라 DataSource는 필요 없다
  const service = new WalletService(null as unknown as DataSource);

  return { service, manager, repo, ledger, wallet };
}

describe('WalletService.earn', () => {
  it('adds coins and returns the new balance', async () => {
    const { service, manager, wallet, repo } = setup(0);

    await expect(
      service.earn(manager, USER_ID, 200, CoinReason.ATTENDANCE),
    ).resolves.toBe(200);
    expect(wallet.coins).toBe(200);
    expect(repo.saveCalls).toHaveLength(1);
  });

  it('records a positive ledger row with the balance after the change', async () => {
    const { service, manager, ledger } = setup(0);

    await service.earn(manager, USER_ID, 200, CoinReason.ATTENDANCE);

    expect(ledger.rows).toHaveLength(1);
    expect(ledger.rows[0]).toMatchObject({
      userId: USER_ID,
      amount: 200,
      balanceAfter: 200,
      reason: CoinReason.ATTENDANCE,
    });
  });

  it('rejects a negative amount without touching the wallet or the ledger', async () => {
    const { service, manager, wallet, repo, ledger } = setup(100);

    await expect(
      service.earn(manager, USER_ID, -10, CoinReason.ATTENDANCE),
    ).rejects.toThrow(BadRequestException);
    expect(wallet.coins).toBe(100);
    expect(repo.saveCalls).toHaveLength(0);
    expect(ledger.rows).toHaveLength(0);
  });

  it('locks the wallet row before writing', async () => {
    const { service, manager, repo } = setup(0);

    await service.earn(manager, USER_ID, 200, CoinReason.ATTENDANCE);

    expect(repo.findOneCalls[0].lock).toEqual({ mode: 'pessimistic_write' });
  });
});

describe('WalletService.spend', () => {
  it('subtracts coins and returns the new balance', async () => {
    const { service, manager, wallet } = setup(100);

    await expect(
      service.spend(manager, USER_ID, 30, CoinReason.FEED),
    ).resolves.toBe(70);
    expect(wallet.coins).toBe(70);
  });

  it('records a negative ledger row', async () => {
    const { service, manager, ledger } = setup(100);

    await service.spend(manager, USER_ID, 30, CoinReason.FEED);

    expect(ledger.rows[0]).toMatchObject({
      amount: -30,
      balanceAfter: 70,
      reason: CoinReason.FEED,
    });
  });

  it('allows spending the exact balance', async () => {
    const { service, manager, wallet } = setup(30);

    await expect(
      service.spend(manager, USER_ID, 30, CoinReason.FEED),
    ).resolves.toBe(0);
    expect(wallet.coins).toBe(0);
  });

  it('rejects when the balance is short and leaves wallet and ledger unchanged', async () => {
    const { service, manager, wallet, repo, ledger } = setup(20);

    await expect(
      service.spend(manager, USER_ID, 30, CoinReason.FEED),
    ).rejects.toThrow(BadRequestException);
    expect(wallet.coins).toBe(20);
    expect(repo.saveCalls).toHaveLength(0);
    expect(ledger.rows).toHaveLength(0);
  });

  it('locks the wallet row before writing', async () => {
    const { service, manager, repo } = setup(100);

    await service.spend(manager, USER_ID, 30, CoinReason.FEED);

    expect(repo.findOneCalls[0].lock).toEqual({ mode: 'pessimistic_write' });
  });
});

describe('WalletService.balance', () => {
  it('returns the balance without locking or writing', async () => {
    const { service, manager, repo, ledger } = setup(420);

    await expect(service.balance(manager, USER_ID)).resolves.toBe(420);
    expect(repo.findOneCalls[0].lock).toBeUndefined();
    expect(repo.saveCalls).toHaveLength(0);
    expect(ledger.rows).toHaveLength(0);
  });
});
