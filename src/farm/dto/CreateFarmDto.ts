import { PickType } from '@nestjs/swagger';
import { FarmEntity } from '../domain/entity/farm.entity';

export class CreateFarmDTO extends PickType(FarmEntity, [
  'name',
  'type',
] as const) {}
