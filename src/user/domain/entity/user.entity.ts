import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Document } from 'mongoose';

export enum UserMethod {
  EMAIL = 'email',
  KAKAO = 'kakao',
}

@Schema({
  collection: 'users',
  timestamps: true,
})
export class User extends Document {
  @ApiProperty({
    description: 'method',
    required: true,
    enum: UserMethod,
  })
  @Prop({ required: true, enum: UserMethod })
  @IsEnum(UserMethod)
  @IsNotEmpty()
  method: UserMethod;

  @ApiProperty({
    description: 'account',
    required: true,
  })
  @Prop({ required: true, unique: true })
  @IsString()
  @IsNotEmpty()
  account: string;

  @ApiProperty({
    description: 'email',
    required: true,
  })
  @Prop({ required: true, unique: true })
  @IsNotEmpty()
  @IsEmail()
  @IsString()
  email: string;

  @ApiProperty({
    description: 'password',
    required: true,
    minLength: 8,
    maxLength: 20,
  })
  @Prop({ required: true })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  password: string;

  @ApiProperty({
    description: 'username',
    required: true,
    minLength: 2,
    maxLength: 20,
  })
  @Prop({ required: true })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  username: string;

  @ApiProperty({
    description: 'nickname',
    required: true,
    minLength: 2,
    maxLength: 20,
  })
  @Prop({ required: true })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  nickname: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
