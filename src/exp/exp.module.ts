import { Module } from '@nestjs/common';
import { ExpController } from './controller/exp.controller';
import { ExpService } from './service/exp.service';

@Module({
  controllers: [ExpController],
  providers: [ExpService],
})
export class ExpModule {}
