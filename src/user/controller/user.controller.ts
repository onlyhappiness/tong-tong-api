import { CurrentUser } from '@/common';
import { JwtAuthGuard } from '@/common/jwt/jwt.guard';
import { CreateFarmDTO } from '@/farm/dto/CreateFarmDto';
import { FarmService } from '@/farm/service/farm.service';
import { CreatePetDTO } from '@/pet/dto/CreatePetDto';
import { PetService } from '@/pet/service/pet.service';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserEntity } from '../domain/entity/user.entity';
import { UserService } from '../service/user.service';

@ApiTags('USER')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,

    private readonly farmService: FarmService,

    private readonly petService: PetService,
  ) {}

  @Get('/farm')
  @ApiOperation({ summary: '내 농장 확인하기' })
  async findFarmByUser(@CurrentUser() currentUser: UserEntity) {
    return await this.farmService.findFarmByUser(currentUser);
  }

  @Post('farm')
  @ApiBody({ type: CreateFarmDTO })
  @ApiOperation({ summary: '농장 설정' })
  async createUserFarm(
    @CurrentUser() currentUser: UserEntity,
    @Body() body: CreateFarmDTO,
  ) {
    return await this.farmService.createUserFarm(currentUser, body);
  }

  @Get('/pet')
  @ApiOperation({ summary: '유저의 펫 목록' })
  async findPetByUser(@CurrentUser() currentUser: UserEntity) {
    return await this.petService.findPetByUser(currentUser);
  }

  @Post('/pet/buy')
  @ApiOperation({ summary: '펫 구입' })
  async createPetByUser(
    @CurrentUser() currentUser: UserEntity,
    @Body() body: CreatePetDTO,
  ) {
    return await this.petService.createPetByUser(currentUser, body);
  }
}
