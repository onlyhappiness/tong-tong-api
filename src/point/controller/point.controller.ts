import { JwtAuthGuard } from '@/common/jwt/jwt.guard';
import { Controller, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PointService } from '../service/point.service';

@ApiTags('POINT')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('point')
export class PointController {
  constructor(private readonly pointService: PointService) {}

  @Patch('/use')
  @ApiOperation({ summary: '포인트 사용' })
  async usePoints() {
    console.log('포인트 사용');
  }

  @Patch('/charge')
  @ApiOperation({ summary: '포인트 충전' })
  async chargePoints() {
    console.log('포인트 충전');
  }
}
