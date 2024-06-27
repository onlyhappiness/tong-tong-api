import { BaseEntity } from '@/common/BaseEntity';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Column, Entity } from 'typeorm';

// 타입
export enum FarmTypeEnum {
  DEFAULT = 'default',
  RIVER = 'river',
  FOREST = 'forest',
}

@Entity({ name: 'farm' })
export class FarmEntity extends BaseEntity {
  @IsString()
  @ApiProperty({ description: '농장 이름' })
  @Column({ type: 'varchar' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: '농장 타입' })
  @Column({ type: 'enum', enum: FarmTypeEnum })
  type: FarmTypeEnum;
}
