import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointController } from './controller/point.controller';
import { PointEntity } from './domain/entity/point.entity';
import { PointService } from './service/point.service';

@Module({
  imports: [TypeOrmModule.forFeature([PointEntity])],
  controllers: [PointController],
  providers: [PointService],
  exports: [PointService],
})
export class PointModule {}
