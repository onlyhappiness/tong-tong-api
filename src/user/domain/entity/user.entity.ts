import { BaseEntity } from '@/common/BaseEntity';
import { FarmEntity } from '@/farm/domain/entity/farm.entity';
import { PetEntity } from '@/pet/domain/entity/pet.entity';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Column, Entity, Index, OneToMany } from 'typeorm';

export enum LoginMethodEnnm {
  EMAIL = 'email',
  KAKAO = 'kakao',
}

@Entity({ name: 'user' })
export class UserEntity extends BaseEntity {
  @Column({ type: 'enum', enum: LoginMethodEnnm })
  @IsString()
  @ApiProperty({ description: '로그인 방식' })
  method: LoginMethodEnnm;

  @Column({ type: 'varchar' })
  @Index()
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ description: '이메일' })
  email: string;

  @Column({ type: 'varchar' })
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: '닉네임' })
  nickname: string;

  @Column({ type: 'varchar' })
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: '유저이름' })
  username: string;

  @Column({ type: 'varchar', select: false })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(20)
  @ApiProperty({ description: '비밀번호' })
  password: string;

  @Column({ type: 'varchar', nullable: true })
  @IsString()
  @ApiProperty({ description: '프로필 사진' })
  profileUrl: string;

  @OneToMany(() => PetEntity, (pet) => pet.User)
  Pet: PetEntity;

  @OneToMany(() => FarmEntity, (farm) => farm.User)
  Farm: FarmEntity;
}
