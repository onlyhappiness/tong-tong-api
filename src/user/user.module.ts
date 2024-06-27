import { FarmEntity } from '@/farm/domain/entity/farm.entity';
import { FarmModule } from '@/farm/farm.module';
import { PetEntity } from '@/pet/domain/entity/pet.entity';
import { PetModule } from '@/pet/pet.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './controller/user.controller';
import { UserEntity } from './domain/entity/user.entity';
import { UserService } from './service/user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, PetEntity, FarmEntity]),
    PetModule,
    FarmModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
