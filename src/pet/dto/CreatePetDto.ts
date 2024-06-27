import { PickType } from '@nestjs/swagger';
import { PetEntity } from '../domain/entity/pet.entity';

export class CreatePetDTO extends PickType(PetEntity, [
  //   'name',
  'type',
  //   'intimacy',    친밀도는 0
  //   'nature',  // 랜덤으로 정하기
  'species',
] as const) {}
