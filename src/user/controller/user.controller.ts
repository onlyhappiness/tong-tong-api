import { CurrentUser } from '@/common';
import { JwtAuthGuard } from '@/common/jwt/jwt.guard';
import { CreateFarmDTO } from '@/farm/dto/CreateFarmDto';
import { FarmService } from '@/farm/service/farm.service';
import { CreatePetDTO } from '@/pet/dto/CreatePetDto';
import { PetService } from '@/pet/service/pet.service';
import { PointService } from '@/point/service/point.service';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserEntity } from '../domain/entity/user.entity';
import { UserService } from '../service/user.service';

@ApiTags('USER 관련')
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,

    private readonly farmService: FarmService,

    private readonly petService: PetService,

    private readonly pointService: PointService,
  ) {}

  @Get('/farm')
  @ApiOperation({ summary: '내 농장 확인하기' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: '농장 조회 성공' })
  @ApiNotFoundResponse({ description: '농장을 찾을 수 없음' })
  async findFarmByUser(@CurrentUser() currentUser: UserEntity) {
    return await this.farmService.findFarmByUser(currentUser);
  }

  @Post('farm-setting')
  @ApiOperation({ summary: '농장 설정' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: CreateFarmDTO })
  @ApiCreatedResponse({ description: '농장 설정 성공' })
  @ApiBadRequestResponse({ description: '잘못된 요청' })
  async createUserFarm(
    @CurrentUser() currentUser: UserEntity,
    @Body() body: CreateFarmDTO,
  ) {
    return await this.farmService.createUserFarm(currentUser, body);
  }

  @Get('/pet-list')
  @ApiOperation({ summary: '내 펫 목록' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: '내 펫 목록 조회 성공' })
  @ApiNotFoundResponse({ description: '펫을 찾을 수 없음' })
  async findPetByUser(@CurrentUser() currentUser: UserEntity) {
    return await this.petService.findPetByUser(currentUser);
  }

  @Post('/pet-buy')
  @ApiOperation({ summary: '펫 구입' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({ description: '펫 구입 성공' })
  @ApiBadRequestResponse({ description: '잘못된 요청' })
  async createPetByUser(
    @CurrentUser() currentUser: UserEntity,
    @Body() body: CreatePetDTO,
  ) {
    return await this.petService.createPetByUser(currentUser, body);
  }

  @Get('/point')
  @ApiOperation({ summary: '포인트 조회' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: '포인트 조회 성공' })
  async getPoint(@CurrentUser() currentUser: UserEntity) {
    return await this.pointService.findPointByUser(currentUser.id);
  }

  @Post('/check-duplicated-nickname')
  @ApiOperation({ summary: '유저 닉네임 중복 확인' })
  @ApiOkResponse({ description: '닉네임 중복일 경우 true' })
  @ApiQuery({
    name: 'nickname',
    required: true,
    description: '유저 닉네임',
  })
  async nicknameDuplicatedCheck(@Query('nickname') nickname: string) {
    return await this.userService.nicknameDuplicatedCheck(nickname);
  }

  @Post('/check-duplicated-email')
  @ApiOperation({ summary: '유저 이메일 중복 확인' })
  @ApiOkResponse({ description: '이메일 중복일 경우 true' })
  @ApiQuery({
    name: 'email',
    required: true,
    description: '유저 이메일',
  })
  async emailDuplicatedCheck(@Query('email') email: string) {
    return await this.userService.emailDuplicatedCheck(email);
  }

  @Post('/check-duplicated-account')
  @ApiOperation({ summary: '유저 계정 중복 확인' })
  @ApiOkResponse({ description: '계정 중복일 경우 true' })
  @ApiQuery({
    name: 'account',
    required: true,
    description: '유저 계정',
  })
  async accountDuplicatedCheck(@Query('account') account: string) {
    return await this.userService.accountDuplicatedCheck(account);
  }
}
