import { CoinReason } from '@/modules/wallet/model/wallet-transaction.entity';
import { WalletService } from '@/modules/wallet/service/wallet.service';
import { BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { PetFeed } from '../model/pet-feed.entity';
import { PetPetting } from '../model/pet-petting.entity';
import { Pet, PetStage } from '../model/pet.entity';
import { hatchedAtOf } from './pet-logic';
import { PetService } from './pet.service';

const USER_ID = 'user-1';
const PET_ID = 'pet-1';
const HOUR = 3_600_000;

/** KST 시각을 UTC Date로. 실행 환경 시간대에 안 흔들리게 한다. */
function kst(iso: string): Date {
  return new Date(`${iso}+09:00`);
}

// 08-09 14:00 생성 → 08-10 06:00 부화 → 08-13 06:00 진화
const CREATED_AT = kst('2026-08-09T14:00');
const NOW = kst('2026-08-11T12:00'); // 부화 후 HATCHED 구간
const TODAY = '2026-08-11';

function makePet(overrides: Partial<Pet> = {}): Pet {
  const pet = new Pet();
  pet.id = PET_ID;
  pet.userId = USER_ID;
  pet.createdAt = CREATED_AT;
  pet.releasedAt = null;
  return Object.assign(pet, overrides);
}

function makePetting(day: string, pettedAt: Date): PetPetting {
  const row = new PetPetting();
  row.petId = PET_ID;
  row.day = day;
  row.pettedAt = pettedAt;
  return row;
}

/** 쓰다듬기 이벤트 저장소. count/findOne/save만 쓰인다. */
class FakePettingRepository {
  saveCalls: PetPetting[] = [];

  constructor(public rows: PetPetting[] = []) {}

  count(options: { where: { petId: string; day: string } }): Promise<number> {
    const { petId, day } = options.where;
    return Promise.resolve(
      this.rows.filter((r) => r.petId === petId && r.day === day).length,
    );
  }

  findOne(options: { where: { petId: string } }): Promise<PetPetting | null> {
    const mine = this.rows
      .filter((r) => r.petId === options.where.petId)
      .sort((a, b) => b.pettedAt.getTime() - a.pettedAt.getTime());
    return Promise.resolve(mine[0] ?? null);
  }

  create(input: Partial<PetPetting>): PetPetting {
    return Object.assign(new PetPetting(), input, { pettedAt: NOW });
  }

  save(row: PetPetting): Promise<PetPetting> {
    this.saveCalls.push(row);
    this.rows.push(row);
    return Promise.resolve(row);
  }

  // loadFacts가 쓰는 집계. day별로 묶어 돌려준다.
  createQueryBuilder() {
    const rows = this.rows;
    const builder = {
      select: () => builder,
      addSelect: () => builder,
      where: () => builder,
      groupBy: () => builder,
      addGroupBy: () => builder,
      getRawMany: () => {
        const byDay = new Map<string, number>();
        for (const r of rows) {
          const key = `${r.petId}|${r.day}`;
          byDay.set(key, (byDay.get(key) ?? 0) + 1);
        }
        return Promise.resolve(
          [...byDay.entries()].map(([key, count]) => {
            const [petId, day] = key.split('|');
            return { petId, day, count: String(count) };
          }),
        );
      },
    };
    return builder;
  }
}

/** 밥 이벤트 저장소. */
class FakeFeedRepository {
  saveCalls: PetFeed[] = [];

  constructor(public rows: PetFeed[] = []) {}

  findOne(options: { where: { petId: string } }): Promise<PetFeed | null> {
    const mine = this.rows
      .filter((r) => r.petId === options.where.petId)
      .sort((a, b) => b.fedAt.getTime() - a.fedAt.getTime());
    return Promise.resolve(mine[0] ?? null);
  }

  create(input: Partial<PetFeed>): PetFeed {
    return Object.assign(new PetFeed(), input, { fedAt: NOW });
  }

  save(row: PetFeed): Promise<PetFeed> {
    this.saveCalls.push(row);
    this.rows.push(row);
    return Promise.resolve(row);
  }
}

/** Pet 저장소. 저장 호출을 세어 "조회가 쓰기가 아님"을 검증한다. */
class FakePetRepository {
  saveCalls: Pet[] = [];

  constructor(private readonly pet: Pet) {}

  findOne(): Promise<Pet | null> {
    return Promise.resolve(this.pet);
  }

  find(): Promise<Pet[]> {
    return Promise.resolve([this.pet]);
  }

  count(): Promise<number> {
    return Promise.resolve(0);
  }

  create(input: Partial<Pet>): Pet {
    return Object.assign(new Pet(), input);
  }

  save(row: Pet): Promise<Pet> {
    this.saveCalls.push(row);
    return Promise.resolve(row);
  }
}

class FakeEntityManager {
  constructor(
    readonly pets: FakePetRepository,
    readonly pettings: FakePettingRepository,
    readonly feeds: FakeFeedRepository,
  ) {}

  getRepository(target: unknown): unknown {
    if (target === PetPetting) return this.pettings;
    if (target === PetFeed) return this.feeds;
    if (target === Pet) return this.pets;
    // User — createEgg가 잠금용으로만 부른다
    return { findOne: () => Promise.resolve(null) };
  }
}

class FakeWalletService {
  earnCalls: { amount: number; reason: CoinReason }[] = [];
  spendCalls: { amount: number; reason: CoinReason }[] = [];

  constructor(private balance: number) {}

  earn(_m: EntityManager, _u: string, amount: number, reason: CoinReason) {
    this.earnCalls.push({ amount, reason });
    this.balance += amount;
    return Promise.resolve(this.balance);
  }

  spend(_m: EntityManager, _u: string, amount: number, reason: CoinReason) {
    if (this.balance < amount) {
      return Promise.reject(new BadRequestException('코인이 부족해요.'));
    }
    this.spendCalls.push({ amount, reason });
    this.balance -= amount;
    return Promise.resolve(this.balance);
  }
}

class FakeDataSource {
  constructor(readonly manager: FakeEntityManager) {}

  transaction<T>(fn: (m: EntityManager) => Promise<T>): Promise<T> {
    return fn(this.manager as unknown as EntityManager);
  }
}

function setup(
  options: {
    pet?: Pet;
    pettings?: PetPetting[];
    feeds?: PetFeed[];
    coins?: number;
  } = {},
) {
  const pet = options.pet ?? makePet();
  const pets = new FakePetRepository(pet);
  const pettings = new FakePettingRepository(options.pettings ?? []);
  const feeds = new FakeFeedRepository(options.feeds ?? []);
  const manager = new FakeEntityManager(pets, pettings, feeds);
  const wallet = new FakeWalletService(options.coins ?? 100);
  const dataSource = new FakeDataSource(manager);
  const service = new PetService(
    dataSource as unknown as DataSource,
    wallet as unknown as WalletService,
  );
  // 조회 경로는 dataSource.manager를 직접 쓴다
  (dataSource as unknown as { manager: unknown }).manager = manager;

  return { service, pet, pets, pettings, feeds, wallet };
}

describe('PetService — 조회는 순수 읽기다', () => {
  it('findAllForUser saves nothing', async () => {
    const { service, pets, pettings, feeds } = setup();

    await service.findAllForUser(USER_ID, NOW);

    expect(pets.saveCalls).toHaveLength(0);
    expect(pettings.saveCalls).toHaveLength(0);
    expect(feeds.saveCalls).toHaveLength(0);
  });

  it('findOneForUser saves nothing and repeats identically', async () => {
    const { service, pets } = setup();

    const first = await service.findOneForUser(USER_ID, PET_ID, NOW);
    const second = await service.findOneForUser(USER_ID, PET_ID, NOW);

    expect(second).toEqual(first);
    expect(pets.saveCalls).toHaveLength(0);
  });

  it('reports a derived stage without persisting it', async () => {
    const { service } = setup();

    const egg = await service.findOneForUser(
      USER_ID,
      PET_ID,
      new Date(hatchedAtOf(CREATED_AT).getTime() - 1),
    );
    const hatched = await service.findOneForUser(USER_ID, PET_ID, NOW);

    expect(egg.stage).toBe(PetStage.EGG);
    expect(hatched.stage).toBe(PetStage.HATCHED);
  });
});

describe('PetService.touch', () => {
  it('records an event, raises intimacy, and grants a coin reward', async () => {
    const { service, pettings, wallet } = setup();

    const res = await service.touch(USER_ID, PET_ID, NOW);

    expect(pettings.saveCalls).toHaveLength(1);
    expect(pettings.saveCalls[0]).toMatchObject({ petId: PET_ID, day: TODAY });
    expect(wallet.earnCalls).toEqual([
      { amount: 20, reason: CoinReason.PETTING },
    ]);
    expect(res.intimacy).toBe(5);
    expect(res.petting).toEqual({ used: 1, max: 3 });
  });

  it('rejects the 4th petting of the day without recording', async () => {
    const old = new Date(NOW.getTime() - 5 * HOUR);
    const { service, pettings, wallet } = setup({
      pettings: [
        makePetting(TODAY, old),
        makePetting(TODAY, old),
        makePetting(TODAY, old),
      ],
    });

    await expect(service.touch(USER_ID, PET_ID, NOW)).rejects.toThrow(
      '오늘은 더 쓰다듬을 수 없어요.',
    );
    expect(pettings.saveCalls).toHaveLength(0);
    expect(wallet.earnCalls).toHaveLength(0);
  });

  it('rejects during cooldown without recording', async () => {
    const { service, pettings, wallet } = setup({
      pettings: [makePetting(TODAY, new Date(NOW.getTime() - 30 * 60_000))],
    });

    await expect(service.touch(USER_ID, PET_ID, NOW)).rejects.toThrow(
      '아직 쓰다듬을 수 없어요.',
    );
    expect(pettings.saveCalls).toHaveLength(0);
    expect(wallet.earnCalls).toHaveLength(0);
  });

  it('reports the daily-cap message when both rules block it', async () => {
    const { service } = setup({
      pettings: [
        makePetting(TODAY, new Date(NOW.getTime() - 60_000)),
        makePetting(TODAY, new Date(NOW.getTime() - 60_000)),
        makePetting(TODAY, new Date(NOW.getTime() - 60_000)),
      ],
    });

    await expect(service.touch(USER_ID, PET_ID, NOW)).rejects.toThrow(
      '오늘은 더 쓰다듬을 수 없어요.',
    );
  });

  it('refuses an egg', async () => {
    const { service, pettings, wallet } = setup();
    const beforeHatch = new Date(hatchedAtOf(CREATED_AT).getTime() - 1);

    await expect(service.touch(USER_ID, PET_ID, beforeHatch)).rejects.toThrow(
      '지금은 할 수 없어요.',
    );
    expect(pettings.saveCalls).toHaveLength(0);
    expect(wallet.earnCalls).toHaveLength(0);
  });
});

describe('PetService.feed', () => {
  it('records hungerAfter and returns the new balance', async () => {
    // 부화(08-10 06:00)부터 NOW(08-11 12:00)까지 30시간 → 배고픔 0
    const { service, feeds, wallet } = setup();

    const res = await service.feed(USER_ID, PET_ID, NOW);

    expect(wallet.spendCalls).toEqual([
      { amount: 30, reason: CoinReason.FEED },
    ]);
    expect(feeds.saveCalls).toHaveLength(1);
    expect(feeds.saveCalls[0].hungerAfter).toBe(40);
    expect(res.hunger).toBe(40);
    expect(res.coins).toBe(70);
  });

  it('leaves no feed row when the balance is short', async () => {
    const { service, feeds } = setup({ coins: 20 });

    await expect(service.feed(USER_ID, PET_ID, NOW)).rejects.toThrow(
      '코인이 부족해요.',
    );
    expect(feeds.saveCalls).toHaveLength(0);
  });
});

describe('PetService.release', () => {
  it('records releasedAt and reports RELEASED afterwards', async () => {
    const { service, pets } = setup();

    const res = await service.release(USER_ID, PET_ID, NOW);

    expect(pets.saveCalls).toHaveLength(1);
    expect(res.releasedAt).toEqual(NOW);
    expect(res.stage).toBe(PetStage.RELEASED);
  });
});
