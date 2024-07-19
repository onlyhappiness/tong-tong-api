import { PickType } from '@nestjs/swagger';
import { PointEntity } from '../domain/entity/point.entity';

export class UsePointDto extends PickType(PointEntity, ['point'] as const) {}
