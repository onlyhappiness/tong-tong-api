import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './controller/user.controller';
import { DailyLimit } from './model/daily-limit.entity';
import { User } from './model/user.entity';
import { Wallet } from './model/wallet.entity';
import { UserService } from './service/user.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Wallet, DailyLimit])],
  controllers: [UserController],
  providers: [UserService],
  exports: [TypeOrmModule],
})
export class UserModule {}
