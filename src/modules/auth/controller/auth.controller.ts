import {
  ClientInfo,
  ClientInfoParam,
} from '@/common/decorators/client-info.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthGuard } from '@/common/guards/auth.guard';
import { User } from '@/modules/user/model/user.entity';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { LoginDTO } from '../dto/login.dto';
import { SignupDTO } from '../dto/signup.dto';
import { AuthService } from '../service/auth.service';
import { CookieService } from '../service/cookie.service';
import { SessionService } from '../service/session.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly cookieService: CookieService,
  ) {}

  @ApiOperation({ summary: '회원가입' })
  @Post('signup')
  async signup(
    @Body() dto: SignupDTO,
    @Res({ passthrough: true }) res: Response,
    @ClientInfoParam() clientInfo: ClientInfo,
  ) {
    const { user, token } = await this.authService.signup(dto, clientInfo);
    this.cookieService.setSession(res, token);
    return this.toPublicUser(user);
  }

  @ApiOperation({ summary: '로그인' })
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDTO,
    @Res({ passthrough: true }) res: Response,
    @ClientInfoParam() clientInfo: ClientInfo,
  ) {
    const { user, token } = await this.authService.login(dto, clientInfo);
    this.cookieService.setSession(res, token);
    return this.toPublicUser(user);
  }

  @ApiOperation({ summary: '로그아웃' })
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = this.cookieService.getSessionToken(req);
    if (token) await this.sessionService.delete(token);
    this.cookieService.clearSession(res);
    return { loggedOut: true };
  }

  @ApiOperation({ summary: '내 정보 조회' })
  @ApiCookieAuth('session_token')
  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: User) {
    return this.toPublicUser(user);
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }
}
