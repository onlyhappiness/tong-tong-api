import { CurrentUser } from '@/common';
import { JwtAuthGuard } from '@/common/jwt/jwt.guard';
import { UserEntity } from '@/user/domain/entity/user.entity';
import { UserService } from '@/user/service/user.service';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  async register(@Body() body: RegisterUserDTO) {
    return await this.authService.createUser(body);
  }

  @Post('/login')
  @ApiBody({ type: LoginUserDTO })
  @ApiOperation({ summary: '로그인' })
  async login(@Body() body: LoginUserDTO) {
    return await this.authService.loginUser(body);
  }

  @Get('/login')
  @ApiOperation({ summary: '로그인 유저 확인' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async loginUser(@CurrentUser() currentUser: UserEntity) {
    return await this.userService.findUserById(currentUser.id);
  }
}
