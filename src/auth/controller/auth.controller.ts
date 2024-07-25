import { CurrentUser } from '@/common';
import { JwtAuthGuard } from '@/common/jwt/jwt.guard';
import { UserEntity } from '@/user/domain/entity/user.entity';
import { UserService } from '@/user/service/user.service';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LoginUserDTO } from '../dto/LoginUserDto';
import { RegisterUserDTO } from '../dto/RegisterUserDto';
import { AuthService } from '../service/auth.service';

@ApiTags('AUTH')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,

    private readonly userService: UserService,
  ) {}

  @Post('/register')
  @ApiBody({ type: RegisterUserDTO })
  @ApiOperation({ summary: '회원가입' })
  @ApiCreatedResponse({ description: '회원가입 성공' })
  @ApiNotFoundResponse({ description: '잘못된 요청' })
  async register(@Body() body: RegisterUserDTO) {
    return await this.authService.createUser(body);
  }

  @Post('/login')
  @ApiBody({ type: LoginUserDTO })
  @ApiOperation({ summary: '로그인' })
  @ApiOkResponse({ description: '로그인 성공' })
  @ApiNotFoundResponse({ description: '유저를 찾을 수 없음' })
  async login(@Body() body: LoginUserDTO) {
    return await this.authService.loginUser(body);
  }

  @Get('/login')
  @ApiOperation({ summary: '로그인 유저 확인' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: '유저 정보 조회 성공' })
  @ApiUnauthorizedResponse({ description: '인증 실패' })
  @ApiNotFoundResponse({ description: '유저를 찾을 수 없음' })
  async loginUser(@CurrentUser() currentUser: UserEntity) {
    return await this.userService.findUserById(currentUser.id);
  }
}
