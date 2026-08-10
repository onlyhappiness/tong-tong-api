import { gameDay } from '@/common/utils/game-day';
import { NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PetFacts } from '../dto/pet-response.dto';
import { PetFeed } from '../model/pet-feed.entity';
import { PetPetting } from '../model/pet-petting.entity';
import { Pet } from '../model/pet.entity';
import { growthDays } from './pet-logic';

// 펫 조회 모음. 호출자의 트랜잭션에 얹혀야 하므로 전부 manager를 인자로 받는다.

/**
 * 내 펫을 잠근 채로 가져온다. 소유권 검사도 여기서 끝낸다.
 * @throws NotFoundException 없거나 내 펫이 아닐 때
 */
export async function loadOwnedPet(
  manager: EntityManager,
  userId: string,
  petId: string,
): Promise<Pet> {
  const pet = await manager.getRepository(Pet).findOne({
    where: { id: petId, userId },
    lock: { mode: 'pessimistic_write' },
  });
  if (!pet) throw new NotFoundException();

  return pet;
}

/**
 * 응답에 필요한 사실을 펫별로 모은다.
 */
export async function loadPetFacts(
  manager: EntityManager,
  pets: Pet[],
  now: Date,
): Promise<Record<string, PetFacts>> {
  if (pets.length === 0) return {};

  const petIds = pets.map((p) => p.id);
  const today = gameDay(now);

  const rows = await manager
    .getRepository(PetPetting)
    .createQueryBuilder('p')
    .select('p.pet_id', 'petId')
    .addSelect('p.day', 'day')
    .addSelect('COUNT(*)', 'count')
    .where('p.pet_id IN (:...petIds)', { petIds })
    .groupBy('p.pet_id')
    .addGroupBy('p.day')
    .getRawMany<{ petId: string; day: string; count: string }>();

  const lastFeeds = await Promise.all(
    petIds.map((petId) =>
      manager.getRepository(PetFeed).findOne({
        where: { petId },
        order: { fedAt: 'DESC' },
      }),
    ),
  );

  const result: Record<string, PetFacts> = {};
  pets.forEach((pet, i) => {
    const growth = growthDays(pet.createdAt);
    const mine = rows.filter((r) => r.petId === pet.id);
    const countOf = (predicate: (day: string) => boolean) =>
      mine
        .filter((r) => predicate(r.day))
        .reduce((sum, r) => sum + Number(r.count), 0);

    result[pet.id] = {
      growthPettingCount: countOf((day) => growth.includes(day)),
      totalPettingCount: countOf(() => true),
      todayPettingCount: countOf((day) => day === today),
      lastFeed: lastFeeds[i],
    };
  });

  return result;
}
