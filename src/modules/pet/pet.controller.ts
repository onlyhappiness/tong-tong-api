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
import { PetService } from './pet.service';

@ApiTags('pet')
@ApiCookieAuth('session_token')
@Controller('pet')
@UseGuards(AuthGuard)
export class PetController {
  constructor(private readonly petService: PetService) {}

  @ApiOperation({ summary: '새 알 생성 — 이미 3마리(비-RELEASED) 있으면 400.' })
  @Post()
  createEgg(@CurrentUser() user: User) {
    return this.petService.createEgg(user.id);
  }

  @ApiOperation({ summary: '내 펫 목록 — 조회할 때마다 정산·저장됨.' })
  @Get()
  findAll(@CurrentUser() user: User) {
    return this.petService.findAllForUser(user.id);
  }

  @ApiOperation({ summary: '펫 단건 조회 — 조회할 때마다 정산·저장됨.' })
  @Get(':id')
  findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.petService.findOneForUser(user.id, id);
  }

  @ApiOperation({ summary: '밥 주기 — 코인 30 차감, 배고픔 +40.' })
  @Post(':id/feed')
  feed(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.petService.feed(user.id, id);
  }

  @ApiOperation({ summary: '쓰다듬기 — 1시간 쿨타임.' })
  @Post(':id/pet')
  pet(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.petService.pet(user.id, id);
  }

  @ApiOperation({ summary: '놓아주기 — 되돌릴 수 없음.' })
  @Post(':id/release')
  release(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.petService.release(user.id, id);
  }
}
