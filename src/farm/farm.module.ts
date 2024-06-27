import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FarmController } from './controller/farm.controller';
import { FarmEntity } from './domain/entity/farm.entity';
import { FarmService } from './service/farm.service';

@Module({
  imports: [TypeOrmModule.forFeature([FarmEntity])],
  controllers: [FarmController],
  providers: [FarmService],
  exports: [FarmService],
})
export class FarmModule {}
