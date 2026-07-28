import {
  EGG_HATCH_MS,
  EVOLUTION_MARGIN,
  EVOLUTION_PERIOD_MS,
  HUNGER_DECAY_PER_HOUR,
  TOTAL_DAYS,
  TOTAL_MS,
} from '@/config/game.constants';
import { PetState } from '../model/pet-state.entity';
import { Pet, PetStage, Species } from '../model/pet.entity';

// 펫의 시간 기반 규칙만 모아둔 순수 함수 모음. now(ms)는 항상 호출한 쪽이 서버 시각으로 넘긴다.

/** 사랑/방치 횟수 차이로 진화할 종을 정한다. 차이가 기준 미만이면 거북이. */
export function classifySpecies(
  loveCount: number,
  neglectCount: number,
): Species {
  if (loveCount >= neglectCount + EVOLUTION_MARGIN) return Species.POODLE;
  if (neglectCount >= loveCount + EVOLUTION_MARGIN) return Species.CAT;
  return Species.TURTLE;
}

/** 부화 이후 몇 번째 24시간 구간인지(0부터). 접속일·사랑 횟수 중복 적립을 막는 열쇠. */
export function periodIndex(hatchedAt: Date, now: number): number {
  return Math.floor((now - hatchedAt.getTime()) / EVOLUTION_PERIOD_MS);
}

/** 방치 횟수 = 전체 일수 - 접속일. 저장하지 않고 필요할 때마다 계산한다. */
export function deriveNeglectCount(pet: Pet, state: PetState): number {
  if (pet.stage === PetStage.EGG) return 0;
  return TOTAL_DAYS - state.activeDayCount;
}

/**
 * 마지막 접속 이후 흐른 시간을 한 번에 정산한다(부화 → 접속일 → 배고픔 → 진화 순).
 * pet과 state를 그 자리에서 수정하며, 저장은 호출한 쪽 책임.
 */
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
