import { BaseEntity } from '@/common/BaseEntity';
import { UserEntity } from '@/user/domain/entity/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

// 타입
export enum FarmTypeEnum {
  DEFAULT = 'default',
  RIVER = 'river',
  FOREST = 'forest',
}

@Entity({ name: 'farm' })
export class FarmEntity extends BaseEntity {
  @Column({ type: 'varchar' })
  @IsString()
  @ApiProperty({ description: '농장 이름' })
  name: string;

  @Column({ type: 'enum', enum: FarmTypeEnum })
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: '농장 타입' })
  type: FarmTypeEnum;

  @ManyToOne(() => UserEntity, (user) => user.Farm, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  User: UserEntity;
}
