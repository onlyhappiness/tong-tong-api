import { Module } from '@nestjs/common';
import { PetController } from './controller/pet.controller';
import { PetService } from './service/pet.service';

@Module({
  providers: [PetService],
  controllers: [PetController],
})
export class PetModule {}
