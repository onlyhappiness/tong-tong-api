import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PetController } from './controller/pet.controller';
import { PetEntity } from './domain/entity/pet.entity';
import { PetService } from './service/pet.service';

@Module({
  imports: [TypeOrmModule.forFeature([PetEntity])],
  controllers: [PetController],
  providers: [PetService],
  exports: [PetService],
})
export class PetModule {}
