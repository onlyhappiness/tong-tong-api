import { ApiProperty } from '@nestjs/swagger';
import { PetState } from '../model/pet-state.entity';
import { Pet, PetStage, Species } from '../model/pet.entity';
import { deriveNeglectCount } from '../service/pet-logic';

// 펫 API 공통 응답. 요청 DTO와 달리 class-validator는 붙이지 않음(검증 대상이 아님).
export class PetResponseDTO {
  @ApiProperty({
    example: '3f1c0b3e-9a2f-4b7a-8c1d-2e5f6a7b8c9d',
    description: '펫 ID',
  })
  id: string;

  @ApiProperty({
    enum: PetStage,
    example: PetStage.HATCHED,
    description: '펫 상태 — 알/부화/진화/놓아줌',
  })
  stage: PetStage;

  @ApiProperty({
    enum: Species,
    nullable: true,
    example: null,
    description: '펫 종류 — 진화(EVOLVED) 전에는 null',
  })
  species: Species | null;

  @ApiProperty({
    nullable: true,
    example: '2026-07-25T09:00:00.000Z',
    description: '부화 시각 — 알 생성 24시간 뒤, 미부화면 null',
  })
  hatchedAt: Date | null;

  @ApiProperty({
    nullable: true,
    example: null,
    description: '진화 시각 — 부화 72시간 뒤, 미진화면 null',
  })
  evolvedAt: Date | null;

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
    example: 2,
    description: '사랑 횟수 — 24시간 구간마다 최대 1회 적립',
  })
  loveCount: number;

  @ApiProperty({
    example: 1,
    description: '방치 횟수 — 저장하지 않고 (전체 3일 - 접속일)로 매번 계산',
  })
  neglectCount: number;
}

export function toPetResponse(pet: Pet, state: PetState): PetResponseDTO {
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
