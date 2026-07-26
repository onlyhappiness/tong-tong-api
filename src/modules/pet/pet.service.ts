import {
  FOOD_PRICE,
  FOOD_RECOVERY,
  HUNGER_MAX,
  INTIMACY_MAX,
  PETTING_COOLDOWN_MS,
  PET_CAP,
} from '@/config/game.constants';
import { User } from '@/modules/user/model/user.entity';
import { Wallet } from '@/modules/user/model/wallet.entity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, Not } from 'typeorm';
import { PetState } from './model/pet-state.entity';
import { Pet, PetStage, Species } from './model/pet.entity';
import { deriveNeglectCount, periodIndex, settlePet } from './pet-logic';

export type PetResponseDto = {
  id: string;
  stage: PetStage;
  species: Species | null;
  hatchedAt: Date | null;
  evolvedAt: Date | null;
  releasedAt: Date | null;
  hunger: number;
  intimacy: number;
  loveCount: number;
  neglectCount: number;
};

function toPetResponse(pet: Pet, state: PetState): PetResponseDto {
  return {
    id: pet.id,
    stage: pet.stage,
    species: pet.species,
    hatchedAt: pet.hatchedAt,
    evolvedAt: pet.evolvedAt,
    releasedAt: pet.releasedAt,
    hunger: state.hunger,
    intimacy: state.intimacy,
    loveCount: state.loveCount,
    neglectCount: deriveNeglectCount(pet, state),
  };
}

@Injectable()
export class PetService {
  constructor(private readonly dataSource: DataSource) {}

  async createEgg(userId: string): Promise<PetResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      // 카운트(집계) 레이스를 막으려고 user row를 잠그고 그 안에서 개수 세고 생성
      await manager.getRepository(User).findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      const activeCount = await manager
        .getRepository(Pet)
        .count({ where: { userId, stage: Not(PetStage.RELEASED) } });

      if (activeCount >= PET_CAP) {
        throw new BadRequestException('펫은 최대 3마리까지 키울 수 있어요.');
      }

      const pet = await manager
        .getRepository(Pet)
        .save(
          manager.getRepository(Pet).create({ userId, stage: PetStage.EGG }),
        );

      const state = await manager
        .getRepository(PetState)
        .save(manager.getRepository(PetState).create({ petId: pet.id }));

      return toPetResponse(pet, state);
    });
  }

  async findAllForUser(userId: string): Promise<PetResponseDto[]> {
    const pets = await this.dataSource
      .getRepository(Pet)
      .find({ where: { userId } });

    return Promise.all(pets.map((p) => this.settleAndSave(userId, p.id)));
  }

  async findOneForUser(userId: string, petId: string): Promise<PetResponseDto> {
    return this.settleAndSave(userId, petId);
  }

  async feed(userId: string, petId: string): Promise<PetResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const { pet, state } = await this.loadOwnedPet(manager, userId, petId);
      settlePet(pet, state, Date.now());

      if (pet.stage === PetStage.EGG || pet.stage === PetStage.RELEASED) {
        throw new BadRequestException('지금은 할 수 없어요.');
      }

      const wallet = await manager
        .getRepository(Wallet)
        .findOne({ where: { userId }, lock: { mode: 'pessimistic_write' } });

      if (!wallet || wallet.coins < FOOD_PRICE) {
        throw new BadRequestException('코인이 부족해요.');
      }

      wallet.coins -= FOOD_PRICE;
      state.hunger = Math.min(HUNGER_MAX, state.hunger + FOOD_RECOVERY);

      await manager.getRepository(Wallet).save(wallet);
      await manager.getRepository(Pet).save(pet);
      await manager.getRepository(PetState).save(state);

      return toPetResponse(pet, state);
    });
  }

  async pet(userId: string, petId: string): Promise<PetResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const { pet, state } = await this.loadOwnedPet(manager, userId, petId);
      const now = Date.now();
      settlePet(pet, state, now);

      if (pet.stage === PetStage.EGG || pet.stage === PetStage.RELEASED) {
        throw new BadRequestException('지금은 할 수 없어요.');
      }

      if (
        state.lastPettedAt &&
        now - state.lastPettedAt.getTime() < PETTING_COOLDOWN_MS
      ) {
        throw new BadRequestException('아직 쓰다듬을 수 없어요.');
      }

      state.lastPettedAt = new Date(now);
      if (pet.hatchedAt) {
        const period = periodIndex(pet.hatchedAt, now);
        if (period !== state.lastPettedPeriod) {
          state.loveCount++;
          state.lastPettedPeriod = period;
        }
      }
      state.intimacy = Math.min(INTIMACY_MAX, state.intimacy + 5);

      await manager.getRepository(Pet).save(pet);
      await manager.getRepository(PetState).save(state);

      return toPetResponse(pet, state);
    });
  }

  async release(userId: string, petId: string): Promise<PetResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const { pet, state } = await this.loadOwnedPet(manager, userId, petId);
      settlePet(pet, state, Date.now());

      if (pet.stage === PetStage.RELEASED) {
        throw new BadRequestException('이미 놓아준 펫이에요.');
      }

      pet.stage = PetStage.RELEASED;
      pet.releasedAt = new Date();

      await manager.getRepository(Pet).save(pet);
      await manager.getRepository(PetState).save(state);

      return toPetResponse(pet, state);
    });
  }

  private async settleAndSave(
    userId: string,
    petId: string,
  ): Promise<PetResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const { pet, state } = await this.loadOwnedPet(manager, userId, petId);
      settlePet(pet, state, Date.now());
      await manager.getRepository(Pet).save(pet);
      await manager.getRepository(PetState).save(state);
      return toPetResponse(pet, state);
    });
  }

  // 관계(join)를 건 상태로 비관적 락을 걸면 드라이버에 따라 실패할 수 있어서,
  // Pet과 PetState를 같은 트랜잭션 안에서 각각 따로 잠그고 조회함.
  private async loadOwnedPet(
    manager: EntityManager,
    userId: string,
    petId: string,
  ): Promise<{ pet: Pet; state: PetState }> {
    const pet = await manager.getRepository(Pet).findOne({
      where: { id: petId, userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!pet) throw new NotFoundException();

    const state = await manager.getRepository(PetState).findOne({
      where: { petId: pet.id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!state) throw new NotFoundException();

    return { pet, state };
  }
}
