import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PetState } from './model/pet-state.entity';
import { Pet } from './model/pet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pet, PetState])],
  exports: [TypeOrmModule],
})
export class PetModule {}
