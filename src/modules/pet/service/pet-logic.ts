import { gameDay, gameDayStart, nextGameDay } from '@/common/utils/game-day';
import {
  CAT_MAX_PETTING,
  HUNGER_DECAY_PER_HOUR,
  HUNGER_MAX,
  INTIMACY_MAX,
  INTIMACY_PER_PETTING,
  POODLE_MIN_PETTING,
  TOTAL_MS,
} from '@/config/game.constants';
import { Pet, PetStage, Species } from '../model/pet.entity';

// 펫의 파생값을 계산하는 순수 함수 모음.
// 저장된 상태를 읽지 않고 사실(createdAt·releasedAt·이벤트 개수)로 계산만 한다.

/**
 * 부화 시각 — 알이 생긴 게임 하루의 익일 하루가 시작하는 06:00.
 */
export function hatchedAtOf(createdAt: Date): Date {
  return gameDayStart(nextGameDay(gameDay(createdAt)));
}

/** 진화 시각 — 부화 + 72h. 경계 정렬 덕분에 이 값도 항상 06:00이다. */
export function evolvedAtOf(createdAt: Date): Date {
  return new Date(hatchedAtOf(createdAt).getTime() + TOTAL_MS);
}

/** 진화 판정에 쓰이는 육성 기간 세 날짜. */
export function growthDays(createdAt: Date): [string, string, string] {
  const first = gameDay(hatchedAtOf(createdAt));
  const second = nextGameDay(first);
  return [first, second, nextGameDay(second)];
}

/** 현재 단계. 놓아준 펫은 시간이 흘러도 진화하지 않으므로 가장 먼저 본다. */
export function stageOf(pet: Pet, now: Date): PetStage {
  if (pet.releasedAt) return PetStage.RELEASED;

  const t = now.getTime();
  if (t < hatchedAtOf(pet.createdAt).getTime()) return PetStage.EGG;
  if (t < evolvedAtOf(pet.createdAt).getTime()) return PetStage.HATCHED;
  return PetStage.EVOLVED;
}

/**
 * 종. 진화에 도달하지 못했으면 `growthPettingCount`가 얼마든 null이다.
 */
export function speciesOf(
  pet: Pet,
  growthPettingCount: number,
  now: Date,
): Species | null {
  const frozenAt = pet.releasedAt ?? now;
  if (frozenAt.getTime() < evolvedAtOf(pet.createdAt).getTime()) return null;

  if (growthPettingCount >= POODLE_MIN_PETTING) return Species.POODLE;
  if (growthPettingCount <= CAT_MAX_PETTING) return Species.CAT;
  return Species.TURTLE;
}

/**
 * 친밀도. 진화 후 쓰다듬기도 반영되어야 하므로 전체 총합을 받는다.
 * speciesOf가 받는 숫자와 다르다는 점에 주의.
 */
export function intimacyOf(totalPettingCount: number): number {
  return Math.min(INTIMACY_MAX, totalPettingCount * INTIMACY_PER_PETTING);
}

/**
 * 배고픔. 마지막 밥의 결과값에서 경과 시간만큼 깎는다.
 *
 * 밥을 한 번도 안 줬으면 기준선은 (부화 시각, 100)이다 — 알일 때는 배고픔이
 * 흐르지 않으므로 생성 시각이 아니라 부화 시각이 출발점이다.
 */
export function hungerOf(
  createdAt: Date,
  lastFeed: { hungerAfter: number; fedAt: Date } | null,
  now: Date,
): number {
  const hatched = hatchedAtOf(createdAt);
  if (now.getTime() < hatched.getTime()) return HUNGER_MAX;

  const base = lastFeed ?? { hungerAfter: HUNGER_MAX, fedAt: hatched };
  const hoursGone = (now.getTime() - base.fedAt.getTime()) / 3_600_000;

  return Math.max(
    0,
    Math.round(base.hungerAfter - HUNGER_DECAY_PER_HOUR * hoursGone),
  );
}
