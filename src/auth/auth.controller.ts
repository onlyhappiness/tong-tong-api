import { CurrentUser } from '@/common/decorators/user.decorator';
import { JwtAuthGuard } from '@/common/jwt/jwt.guard';
import { User } from '@/user/domain/entity/user.entity';
import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginUserDTO } from './dto/login.dto';
import { RegisterUserDTO } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/register')
  @ApiOperation({ summary: '회원가입' })
  @ApiBody({ type: RegisterUserDTO })
  async register(@Body() body: RegisterUserDTO) {
    return await this.authService.createUser(body);
  }

  @Post('/login')
  @ApiOperation({ summary: '로그인' })
  @ApiBody({ type: LoginUserDTO })
  async login(@Body() body: LoginUserDTO, @Res() res: Response) {
    const result = await this.authService.login(body);

    // 쿠키설정
    res.cookie('authorization', result.token, {
      maxAge: 1000 * 10,
      // sameSite: 'none',
      // secure: true,
      httpOnly: true,
    });

    return res.send({
      success: true,
      data: true,
      timestamp: new Date().toISOString(),
    });
  }

  @Get('/login')
  @ApiOperation({ summary: '로그인 유저확인' })
  @UseGuards(JwtAuthGuard)
  async loginUser(@CurrentUser() user: User) {
    return user;
  }

  @Delete('/logout')
  @ApiOperation({ summary: '로그아웃' })
  async logout(@Req() req: Request, @Res() res: Response) {
    res.clearCookie('authorization');
    return res.send({
      success: true,
      data: true,
      timestamp: new Date().toISOString(),
    });
  }
}
