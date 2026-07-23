import {
  EGG_HATCH_MS,
  EVOLUTION_MARGIN,
  EVOLUTION_PERIOD_MS,
  HUNGER_DECAY_PER_HOUR,
  TOTAL_DAYS,
  TOTAL_MS,
} from '@/config/game.constants';
import { Pet, PetStage, Species } from './model/pet.entity';
import { PetState } from './model/pet-state.entity';

export function classifySpecies(
  loveCount: number,
  neglectCount: number,
): Species {
  if (loveCount >= neglectCount + EVOLUTION_MARGIN) return Species.POODLE;
  if (neglectCount >= loveCount + EVOLUTION_MARGIN) return Species.CAT;
  return Species.TURTLE;
}

export function periodIndex(hatchedAt: Date, now: number): number {
  return Math.floor((now - hatchedAt.getTime()) / EVOLUTION_PERIOD_MS);
}

export function deriveNeglectCount(pet: Pet, state: PetState): number {
  if (pet.stage === PetStage.EGG) return 0;
  return TOTAL_DAYS - state.activeDayCount;
}

export function settlePet(pet: Pet, state: PetState, now: number): void {
  // 1. 부화 체크
  if (
    pet.stage === PetStage.EGG &&
    now >= pet.createdAt.getTime() + EGG_HATCH_MS
  ) {
    const hatchInstant = pet.createdAt.getTime() + EGG_HATCH_MS;
    pet.stage = PetStage.HATCHED;
    pet.hatchedAt = new Date(hatchInstant);
    state.hungerUpdatedAt = new Date(hatchInstant);
  }

  // 2. 접속일 기록 (HATCHED만) — 반복문 없음, 정수 비교 한 번
  if (pet.stage === PetStage.HATCHED && pet.hatchedAt) {
    const period = periodIndex(pet.hatchedAt, now);
    if (period < TOTAL_DAYS && period !== state.lastActivePeriod) {
      state.activeDayCount++;
      state.lastActivePeriod = period;
    }
  }

  // 3. 배고픔 재계산 (HATCHED 또는 EVOLVED)
  if (
    (pet.stage === PetStage.HATCHED || pet.stage === PetStage.EVOLVED) &&
    state.hungerUpdatedAt
  ) {
    const hoursGone = (now - state.hungerUpdatedAt.getTime()) / 3_600_000;
    state.hunger = Math.max(
      0,
      Math.round(state.hunger - HUNGER_DECAY_PER_HOUR * hoursGone),
    );
    state.hungerUpdatedAt = new Date(now);
  }

  // 4. 진화 체크 — neglectCount는 저장 안 하고 여기서 바로 계산해서 넘김
  if (
    pet.stage === PetStage.HATCHED &&
    pet.hatchedAt &&
    now >= pet.hatchedAt.getTime() + TOTAL_MS
  ) {
    pet.stage = PetStage.EVOLVED;
    pet.species = classifySpecies(
      state.loveCount,
      TOTAL_DAYS - state.activeDayCount,
    );
    pet.evolvedAt = new Date(now);
  }
}
