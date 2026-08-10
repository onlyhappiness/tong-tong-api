import { PETTING_DAILY_CAP } from '@/config/game.constants';
import { ApiProperty } from '@nestjs/swagger';
import { Pet, PetStage, Species } from '../model/pet.entity';
import {
  evolvedAtOf,
  hatchedAtOf,
  hungerOf,
  intimacyOf,
  speciesOf,
  stageOf,
} from '../service/pet-logic';

/**
 * 응답을 만드는 데 필요한, DB에서 온 사실들.
 *
 * 필드 이름을 길게 둔 이유가 있다. growthPettingCount와 totalPettingCount는
 * 둘 다 number라 바꿔 넣어도 컴파일이 통과하는데, 바꾸면 진화 후 쓰다듬기가
 * 종을 바꾸거나(전자에 전체를 넣음) 친밀도가 멈춘다(후자에 육성분을 넣음).
 */
export interface PetFacts {
  /** 육성 기간(growthDays) 안의 쓰다듬기 횟수. 종 판정용. 0~9 */
  growthPettingCount: number;
  /** 전체 쓰다듬기 횟수. 친밀도용. 진화 후에도 는다 */
  totalPettingCount: number;
  /** 오늘 쓰다듬기 횟수. 하루 한도 표시용 */
  todayPettingCount: number;
  /** 마지막 밥. 없으면 부화 시점 100이 기준선이 된다 */
  lastFeed: { hungerAfter: number; fedAt: Date } | null;
}

export class PettingLimitDTO {
  @ApiProperty({ example: 2, description: '오늘 이 펫을 쓰다듬은 횟수' })
  used: number;

  @ApiProperty({ example: 3, description: '펫당 하루 상한' })
  max: number;
}

// 펫 API 공통 응답. 요청 DTO와 달리 class-validator는 붙이지 않음(검증 대상이 아님).
export class PetResponseDTO {
  @ApiProperty({
    description: '펫 ID',
  })
  id: string;

  @ApiProperty({
    enum: PetStage,
    example: PetStage.HATCHED,
    description: '펫 상태 — 저장하지 않고 계산된 값',
  })
  stage: PetStage;

  @ApiProperty({
    enum: Species,
    nullable: true,
    example: null,
    description: '펫 종류 — 진화 전에는 null',
  })
  species: Species | null;

  @ApiProperty({
    example: '2026-08-10T06:00:00.000Z',
    description: '부화 시각 — 알 생성 다음 게임 하루의 KST 06:00',
  })
  hatchedAt: Date;

  @ApiProperty({
    example: '2026-08-10T06:00:00.000Z',
    description: '진화 시각 — 부화 72시간 뒤',
  })
  evolvedAt: Date;

  @ApiProperty({
    nullable: true,
    example: null,
    description: '놓아준 시각 — 놓아주지 않았으면 null',
  })
  releasedAt: Date | null;

  @ApiProperty({
    example: 80,
    minimum: 0,
    maximum: 100,
    description: '배고픔 — 시간당 10씩 감소, 밥 주면 +40',
  })
  hunger: number;

  @ApiProperty({
    example: 25,
    minimum: 0,
    maximum: 100,
    description: '친밀도 — 쓰다듬을 때마다 +5',
  })
  intimacy: number;

  @ApiProperty({
    type: PettingLimitDTO,
    description: '이 펫의 오늘 쓰다듬기 횟수',
  })
  petting: PettingLimitDTO;

  @ApiProperty({
    required: false,
    example: 640,
    description:
      '지급/차감 후 코인 잔액 — 지갑을 만지는 응답(밥 주기·쓰다듬기)에만 실린다',
  })
  coins?: number;
}

/**
 * 사실 → 응답. 저장하지 않고 계산만 한다.
 *
 * @param coins 지갑을 만진 경우에만 넘긴다. 조회 경로는 생략한다.
 */
export function toPetResponse(
  pet: Pet,
  facts: PetFacts,
  now: Date,
  coins?: number,
): PetResponseDTO {
  return {
    id: pet.id,
    stage: stageOf(pet, now),
    species: speciesOf(pet, facts.growthPettingCount, now),
    hatchedAt: hatchedAtOf(pet.createdAt),
    evolvedAt: evolvedAtOf(pet.createdAt),
    releasedAt: pet.releasedAt,
    hunger: hungerOf(pet.createdAt, facts.lastFeed, now),
    intimacy: intimacyOf(facts.totalPettingCount),
    petting: { used: facts.todayPettingCount, max: PETTING_DAILY_CAP },
    ...(coins === undefined ? {} : { coins }),
  };
}

/** 이벤트가 하나도 없는 펫(방금 만든 알)의 사실. */
export const NO_FACTS: PetFacts = {
  growthPettingCount: 0,
  totalPettingCount: 0,
  todayPettingCount: 0,
  lastFeed: null,
};
