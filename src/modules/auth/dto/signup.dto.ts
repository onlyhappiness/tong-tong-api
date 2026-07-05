import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class SignupDTO {
  @ApiProperty({ example: 'user@example.com', description: '로그인 이메일' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'secret123',
    minLength: 8,
    description: '비밀번호 (8자 이상)',
  })
  @IsString()
  @MinLength(8)
  password: string;
}
