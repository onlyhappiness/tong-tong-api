import { gameDay } from '@/common/utils/game-day';
import {
  FOOD_PRICE,
  FOOD_RECOVERY,
  HUNGER_MAX,
  PET_CAP,
  PETTING_COOLDOWN_MS,
  PETTING_DAILY_CAP,
  PETTING_REWARD,
} from '@/config/game.constants';
import { User } from '@/modules/user/model/user.entity';
import { CoinReason } from '@/modules/wallet/model/wallet-transaction.entity';
import { WalletService } from '@/modules/wallet/service/wallet.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import {
  NO_FACTS,
  PetResponseDTO,
  toPetResponse,
} from '../dto/pet-response.dto';
import { PetFeed } from '../model/pet-feed.entity';
import { PetPetting } from '../model/pet-petting.entity';
import { Pet, PetStage } from '../model/pet.entity';
import { hungerOf, stageOf } from './pet-logic';
import { loadOwnedPet, loadPetFacts } from './pet-query';

@Injectable()
export class PetService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
  ) {}

  /**
   * 새 알을 만든다. 놓아주지 않은 펫이 이미 3마리면 거절.
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
        .count({ where: { userId, releasedAt: IsNull() } });

      if (activeCount >= PET_CAP) {
        throw new BadRequestException('펫은 최대 3마리까지 키울 수 있어요');
      }

      const pet = await m
        .getRepository(Pet)
        .save(m.getRepository(Pet).create({ userId }));

      // 방금 만든 알이라 이벤트가 있을 수 없다. 조회를 생략한다.
      return toPetResponse(pet, NO_FACTS, new Date());
    };

    return manager ? run(manager) : this.dataSource.transaction(run);
  }

  /**
   * 내 펫 전체 조회. 놓아준 펫도 포함한다.
   */
  async findAllForUser(userId: string, now: Date): Promise<PetResponseDTO[]> {
    const manager = this.dataSource.manager;
    const pets = await manager.getRepository(Pet).find({ where: { userId } });
    const facts = await loadPetFacts(manager, pets, now);

    return pets.map((pet) => toPetResponse(pet, facts[pet.id], now));
  }

  /**
   * 펫 단건 조회.
   * @throws NotFoundException 없거나 내 펫이 아닐 때
   */
  async findOneForUser(
    userId: string,
    petId: string,
    now: Date,
  ): Promise<PetResponseDTO> {
    const manager = this.dataSource.manager;
    const pet = await manager
      .getRepository(Pet)
      .findOne({ where: { id: petId, userId } });
    if (!pet) throw new NotFoundException();

    const facts = await loadPetFacts(manager, [pet], now);

    return toPetResponse(pet, facts[pet.id], now);
  }

  /**
   * 밥 주기. 코인 30을 차감하고 배고픔을 40 회복시킨다(상한 100).
   * @throws BadRequestException 알/놓아준 상태이거나 코인이 부족할 때
   */
  async feed(
    userId: string,
    petId: string,
    now: Date,
  ): Promise<PetResponseDTO> {
    return this.dataSource.transaction(async (manager) => {
      const pet = await loadOwnedPet(manager, userId, petId);
      this.assertActionable(pet, now);

      const coins = await this.walletService.spend(
        manager,
        userId,
        FOOD_PRICE,
        CoinReason.FEED,
      );

      const facts = await loadPetFacts(manager, [pet], now);
      const hungerAfter = Math.min(
        HUNGER_MAX,
        hungerOf(pet.createdAt, facts[pet.id].lastFeed, now) + FOOD_RECOVERY,
      );

      await manager
        .getRepository(PetFeed)
        .save(manager.getRepository(PetFeed).create({ petId, hungerAfter }));

      // 방금 넣은 행이 곧 마지막 밥이다. 다시 조회하지 않고 손에 있는 값으로 조립한다.
      return toPetResponse(
        pet,
        { ...facts[pet.id], lastFeed: { hungerAfter, fedAt: now } },
        now,
        coins,
      );
    });
  }

  /**
   * 쓰다듬기. 친밀도를 5 올리고, 코인을 지급하고, 1시간 쿨타임이 걸린다.
   * 펫당 하루 3회.
   * @throws BadRequestException 알/놓아준 상태, 오늘 한도 소진, 아직 쿨타임일 때
   */
  async touch(
    userId: string,
    petId: string,
    now: Date,
  ): Promise<PetResponseDTO> {
    return this.dataSource.transaction(async (manager) => {
      const pet = await loadOwnedPet(manager, userId, petId);
      this.assertActionable(pet, now);

      const pettingRepo = manager.getRepository(PetPetting);
      const day = gameDay(now);

      // 한도를 쿨타임보다 먼저 본다 — 3회를 다 쓴 유저에게
      // "1시간 뒤에 오세요"라고 하면 헛걸음시킨다.
      const used = await pettingRepo.count({ where: { petId, day } });
      if (used >= PETTING_DAILY_CAP) {
        throw new BadRequestException('오늘은 더 쓰다듬을 수 없어요.');
      }

      // day로 거르지 않는다. 쿨타임은 하루 경계와 무관한 규칙이라, 06:00 직후에
      // 어제 05:30 쓰다듬기의 1시간이 아직 안 지났으면 여전히 막아야 한다.
      const last = await pettingRepo.findOne({
        where: { petId },
        order: { pettedAt: 'DESC' },
      });
      if (
        last &&
        now.getTime() - last.pettedAt.getTime() < PETTING_COOLDOWN_MS
      ) {
        throw new BadRequestException('아직 쓰다듬을 수 없어요.');
      }

      await pettingRepo.save(pettingRepo.create({ petId, day }));

      // 여기까지 왔으면 코인은 반드시 나간다. 분기가 없다.
      const coins = await this.walletService.earn(
        manager,
        userId,
        PETTING_REWARD,
        CoinReason.PETTING,
      );

      const facts = await loadPetFacts(manager, [pet], now);

      return toPetResponse(pet, facts[pet.id], now, coins);
    });
  }

  /**
   * 놓아주기. 되돌릴 수 없고, 이후 펫 상한 계산에서 빠진다.
   * @throws BadRequestException 이미 놓아준 펫일 때
   */
  async release(
    userId: string,
    petId: string,
    now: Date,
  ): Promise<PetResponseDTO> {
    return this.dataSource.transaction(async (manager) => {
      const pet = await loadOwnedPet(manager, userId, petId);

      if (pet.releasedAt) {
        throw new BadRequestException('이미 놓아준 펫이에요.');
      }

      pet.releasedAt = now;
      await manager.getRepository(Pet).save(pet);

      const facts = await loadPetFacts(manager, [pet], now);

      return toPetResponse(pet, facts[pet.id], now);
    });
  }

  /** 알이거나 놓아준 펫에는 액션을 할 수 없다. */
  private assertActionable(pet: Pet, now: Date): void {
    const stage = stageOf(pet, now);
    if (stage === PetStage.EGG || stage === PetStage.RELEASED) {
      throw new BadRequestException('지금은 할 수 없어요.');
    }
  }
}
