import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { Account } from '../auth/model/account.entity';
import { Session } from '../auth/model/session.entity';
import { Verification } from '../auth/model/verification.entity';
import { PetState } from '../pet/model/pet-state.entity';
import { Pet } from '../pet/model/pet.entity';
import { User } from '../user/model/user.entity';
import { WalletTransaction } from '../wallet/model/wallet-transaction.entity';
import { Wallet } from '../wallet/model/wallet.entity';
import { Attendance } from '../attendance/model/attendance.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow('database.host'),
        port: configService.getOrThrow('database.port'),
        username: configService.getOrThrow('database.user'),
        password: configService.getOrThrow('database.password'),
        database: configService.getOrThrow('database.name'),
        namingStrategy: new SnakeNamingStrategy(),
        entities: [
          User,
          Account,
          Session,
          Verification,
          Wallet,
          WalletTransaction,
          Attendance,
          Pet,
          PetState,
        ],
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
