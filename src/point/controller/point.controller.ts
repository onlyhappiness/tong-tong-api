import { CurrentUser } from '@/common';
import { JwtAuthGuard } from '@/common/jwt/jwt.guard';
import { UserEntity } from '@/user/domain/entity/user.entity';
import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsePointDto } from '../dto/UsePointDto';
import { PointService } from '../service/point.service';

@ApiTags('POINT')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('point')
export class PointController {
  constructor(private readonly pointService: PointService) {}

  @Patch('/use')
  @ApiOperation({ summary: '포인트 사용' })
  @ApiOkResponse({ description: '포인트 사용 성공' })
  async usePoints(
    @CurrentUser() currentUser: UserEntity,
    @Body() body: UsePointDto,
  ) {
    return await this.pointService.usePoints(currentUser, body);
  }

  @Patch('/charge')
  @ApiOperation({ summary: '포인트 충전' })
  async chargePoints(
    @CurrentUser() currentUser: UserEntity,
    @Body() body: UsePointDto,
  ) {
    return await this.pointService.chargePoints(currentUser, body);
  }
}
