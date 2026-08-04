import {
  FOOD_PRICE,
  FOOD_RECOVERY,
  HUNGER_MAX,
  INTIMACY_MAX,
  PET_CAP,
  PETTING_COOLDOWN_MS,
} from '@/config/game.constants';
import { User } from '@/modules/user/model/user.entity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, Not } from 'typeorm';
import { PetResponseDTO, toPetResponse } from '../dto/pet-response.dto';
import { PetState } from '../model/pet-state.entity';
import { Pet, PetStage } from '../model/pet.entity';
import { periodIndex, settlePet } from './pet-logic';
import { Wallet } from '@/modules/wallet/model/wallet.entity';

@Injectable()
export class PetService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * 새 알을 만든다. 비-RELEASED 펫이 이미 3마리면 거절.
   *
   * @param userId 소유자 ID
   * @returns 방금 만든 알의 응답 DTO
   * @throws BadRequestException 보유 펫이 상한(3마리)일 때
   */
  async createEgg(
    userId: string,
    manager?: EntityManager,
  ): Promise<PetResponseDTO> {
    const run = async (m: EntityManager): Promise<PetResponseDTO> => {
      // 카운트 레이스를 막으려고 user row를 잠그고 그 안에서 개수 세고 생성
      await m.getRepository(User).findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      const activeCount = await m
        .getRepository(Pet)
        .count({ where: { userId, stage: Not(PetStage.RELEASED) } });

      if (activeCount >= PET_CAP) {
        throw new BadRequestException('펫은 최대 3마리까지 키울 수 있어요');
      }

      const pet = await m
        .getRepository(Pet)
        .save(m.getRepository(Pet).create({ userId, stage: PetStage.EGG }));

      const state = await m.getRepository(PetState).save(
        m.getRepository(PetState).create({
          petId: pet.id,
        }),
      );

      return toPetResponse(pet, state);
    };

    return manager ? run(manager) : this.dataSource.transaction(run);
  }

  /**
   * 내 펫 전체 조회. 놓아준 펫도 포함하며, 각각 서버 시각 기준으로 정산 후 반환한다.
   *
   * @param userId 소유자 ID
   * @returns 정산이 끝난 펫 목록
   */
  async findAllForUser(userId: string): Promise<PetResponseDTO[]> {
    const pets = await this.dataSource
      .getRepository(Pet)
      .find({ where: { userId } });

    return Promise.all(pets.map((p) => this.settleAndSave(userId, p.id)));
  }

  /**
   * 펫 단건 조회. 조회 시점에 정산도 함께 이뤄진다.
   *
   * @param userId 소유자 ID
   * @param petId 조회할 펫 ID
   * @returns 정산이 끝난 펫
   * @throws NotFoundException 없거나 내 펫이 아닐 때
   */
  async findOneForUser(userId: string, petId: string): Promise<PetResponseDTO> {
    return this.settleAndSave(userId, petId);
  }

  /**
   * 밥 주기. 코인 30을 차감하고 배고픔을 40 회복시킨다(상한 100).
   * 지갑은 잔액 경합을 막으려고 같은 트랜잭션에서 잠근 뒤 차감한다.
   *
   * @param userId 소유자 ID
   * @param petId 밥 줄 펫 ID
   * @returns 밥을 준 뒤의 펫 상태
   * @throws BadRequestException 알/놓아준 상태이거나 코인이 부족할 때
   * @throws NotFoundException 없거나 내 펫이 아닐 때
   */
  async feed(userId: string, petId: string): Promise<PetResponseDTO> {
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

  /**
   * 쓰다듬기. 친밀도를 5 올리고(상한 100), 1시간 쿨타임이 걸린다.
   * loveCount는 24시간 구간당 1회만 오르므로, 쿨타임마다 눌러도 하루치는 한 번만 적립된다.
   *
   * @param userId 소유자 ID
   * @param petId 쓰다듬을 펫 ID
   * @returns 쓰다듬은 뒤의 펫 상태
   * @throws BadRequestException 알/놓아준 상태이거나 아직 쿨타임일 때
   * @throws NotFoundException 없거나 내 펫이 아닐 때
   */
  async pet(userId: string, petId: string): Promise<PetResponseDTO> {
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

  /**
   * 놓아주기. 되돌릴 수 없고, 이후 펫 상한(3마리) 계산에서 빠진다.
   * 코인은 User 소유라 놓아줘도 그대로 남는다.
   *
   * @param userId 소유자 ID
   * @param petId 놓아줄 펫 ID
   * @returns RELEASED로 바뀐 펫
   * @throws BadRequestException 이미 놓아준 펫일 때
   * @throws NotFoundException 없거나 내 펫이 아닐 때
   */
  async release(userId: string, petId: string): Promise<PetResponseDTO> {
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

  /**
   * 조회 전용 정산. 부화·접속일·배고픔·진화를 서버 시각 기준으로 다시 계산해 저장한다.
   * 클라이언트 시계를 절대 믿지 않기 위해 조회할 때마다 여기서 지연 계산한다.
   *
   * @param userId 소유자 ID
   * @param petId 정산할 펫 ID
   * @returns 정산 결과가 반영된 펫
   */
  private async settleAndSave(
    userId: string,
    petId: string,
  ): Promise<PetResponseDTO> {
    return this.dataSource.transaction(async (manager) => {
      const { pet, state } = await this.loadOwnedPet(manager, userId, petId);
      settlePet(pet, state, Date.now());
      await manager.getRepository(Pet).save(pet);
      await manager.getRepository(PetState).save(state);
      return toPetResponse(pet, state);
    });
  }

  /**
   * 내 펫과 그 상태를 잠근 채로 함께 가져온다. 소유권 검사도 여기서 끝낸다.
   * 관계(join)를 건 상태로 비관적 락을 걸면 드라이버에 따라 실패할 수 있어서,
   * Pet과 PetState를 같은 트랜잭션 안에서 각각 따로 잠그고 조회한다.
   *
   * @param manager 호출한 쪽의 트랜잭션 매니저
   * @param userId 소유자 ID
   * @param petId 가져올 펫 ID
   * @returns 잠긴 펫과 펫 상태
   * @throws NotFoundException 없거나 내 펫이 아닐 때
   */
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
