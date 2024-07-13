import { Module } from '@nestjs/common';
import { PointController } from './controller/point.controller';
import { PointService } from './service/point.service';

@Module({
  controllers: [PointController],
  providers: [PointService],
})
export class PointModule {}
