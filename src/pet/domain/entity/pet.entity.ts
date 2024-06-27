import { BaseEntity } from '@/common/BaseEntity';
import { UserEntity } from '@/user/domain/entity/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

// 타입
export enum PetTypeEnum {
  EGG = 'egg', // 알
  CHICK = 'chick', // 병아리

  CHICKEN = 'chicken', // 닭
  DUCK = 'duck', // 오리
  PIG = 'pig', // 돼지
  FOX = 'fox', // 여우
  HEDGEHOG = 'hedgehog', // 고슴도치
  RED_PANDA = 'red-panda', // 레서판다

  POODLE = 'poodle', // 푸들
  TURTLE = 'turtle', // 거북이
}

// 성격 - 공격, 방어, 스피드
export enum PetNatureEnum {
  LONELY = 'lonely', // 외로움을 타는  - 공 👆 방👇
  BRAVE = 'brave', // 용감한 - 공 👆 스피드👇

  BOLD = 'bold', // 대담한 - 방 👆 공 👇
  RELAXED = 'relaxed', // 무사태평한 - 방 👆 스피드 👇

  TIMID = 'timid', // 겁쟁이 같은 - 스피드 👆 공👇
  HASTY = 'hasty', // 성급한 - 스피드 👆 방👇
}

// 종류
export enum PetSpeciesEnum {
  DEFAULT = 'default',
  GOLD = 'gold',
  WHITE = 'white',
  BLACK = 'black',
}

@Entity({ name: 'pet' })
export class PetEntity extends BaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  @IsString()
  @MaxLength(10)
  @ApiProperty({ description: '이름' })
  name: string;

  @Column({ type: 'enum', enum: PetTypeEnum })
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: '펫 타입' })
  type: PetTypeEnum;

  @Column({ type: 'int' })
  @IsInt()
  @Min(0, { message: '친밀도 최소값은 0입니다.' })
  @Max(100, { message: '친밀도 최대치는 100입니다.' })
  @ApiProperty({ description: '친밀도' })
  intimacy: number;

  @Column({ type: 'enum', enum: PetNatureEnum })
  @IsString()
  @ApiProperty({ description: '성격' })
  nature: PetNatureEnum;

  @Column({ type: 'enum', enum: PetSpeciesEnum })
  @IsString()
  @ApiProperty({ description: '종류' })
  species: PetSpeciesEnum;

  @ManyToOne(() => UserEntity, (user) => user.Pet, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  User: UserEntity;
}
