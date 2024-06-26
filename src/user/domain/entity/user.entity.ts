import { BaseEntity } from '@/common/BaseEntity';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Column, Entity, Index } from 'typeorm';

export enum LoginMethodEnnm {
  EMAIL = 'email',
  KAKAO = 'kakao',
}

@Entity({ name: 'user' })
export class UserEntity extends BaseEntity {
  @IsString()
  @ApiProperty({ description: '로그인 방식' })
  @Column({ type: 'enum', enum: LoginMethodEnnm })
  method: LoginMethodEnnm;

  @Index()
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ description: '이메일' })
  @Column({ type: 'varchar' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: '닉네임' })
  @Column({ type: 'varchar' })
  nickname: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: '유저이름' })
  @Column({ type: 'varchar' })
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(20)
  @ApiProperty({ description: '비밀번호' })
  @Column({ type: 'varchar', select: false })
  password: string;

  // 프로필 사진
}
