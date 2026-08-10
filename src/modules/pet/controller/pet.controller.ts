import { ApiSuccessResponse } from '@/common/decorators/api-success-response.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthGuard } from '@/common/guards/auth.guard';
import { User } from '@/modules/user/model/user.entity';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PetResponseDTO } from '../dto/pet-response.dto';
import { PetService } from '../service/pet.service';

@ApiTags('pet')
@ApiCookieAuth('session_token')
@Controller('pet')
@UseGuards(AuthGuard)
export class PetController {
  constructor(private readonly petService: PetService) {}

  @ApiOperation({ summary: '새 알 생성' })
  @ApiSuccessResponse(PetResponseDTO, { status: 201 })
  @Post()
  createEgg(@CurrentUser() user: User) {
    return this.petService.createEgg(user.id);
  }

  @ApiOperation({ summary: '내 펫 목록 조회' })
  @ApiSuccessResponse(PetResponseDTO, { isArray: true })
  @Get()
  findAll(@CurrentUser() user: User) {
    return this.petService.findAllForUser(user.id, new Date());
  }

  @ApiOperation({ summary: '펫 단건 조회' })
  @ApiSuccessResponse(PetResponseDTO)
  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.petService.findOneForUser(user.id, id, new Date());
  }

  @ApiOperation({ summary: '밥 주기' })
  @ApiSuccessResponse(PetResponseDTO, { status: 201 })
  @Post(':id/feed')
  feed(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.petService.feed(user.id, id, new Date());
  }

  @ApiOperation({ summary: '쓰다듬기' })
  @ApiSuccessResponse(PetResponseDTO, { status: 201 })
  @Post(':id/touch')
  touch(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.petService.touch(user.id, id, new Date());
  }

  @ApiOperation({ summary: '놓아주기' })
  @ApiSuccessResponse(PetResponseDTO, { status: 201 })
  @Post(':id/release')
  release(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.petService.release(user.id, id, new Date());
  }
}
