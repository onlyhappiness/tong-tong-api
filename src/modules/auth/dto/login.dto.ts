import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDTO {
  @ApiProperty({ example: 'user@example.com', description: '로그인 이메일' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'secret123', description: '비밀번호' })
  @IsString()
  password: string;
}
