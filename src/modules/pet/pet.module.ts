import { User } from '@/modules/user/model/user.entity';
import { Wallet } from '@/modules/user/model/wallet.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PetState } from './model/pet-state.entity';
import { Pet } from './model/pet.entity';
import { PetService } from './pet.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pet, PetState, Wallet, User])],
  providers: [PetService],
  exports: [PetService, TypeOrmModule],
})
export class PetModule {}
