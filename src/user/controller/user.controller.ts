import { JwtAuthGuard } from '@/common/jwt/jwt.guard';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from '../service/user.service';

@ApiTags('USER')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/pets')
  @ApiOperation({ summary: '유저의 펫 목록' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getPets() {
    return '유저의 펫 목록';
  }
}
