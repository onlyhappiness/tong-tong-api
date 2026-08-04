import { Module } from '@nestjs/common';
import { WalletService } from './service/wallet.service';
import { WalletController } from './controller/wallet.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './model/wallet.entity';
import { WalletTransaction } from './model/wallet-transaction.entity';
import { Session } from '../auth/model/session.entity';
import { User } from '../user/model/user.entity';
import { SessionService } from '../auth/service/session.service';
import { CookieService } from '../auth/service/cookie.service';
import { AuthGuard } from '@/common/guards/auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, WalletTransaction, Session, User]),
  ],
  controllers: [WalletController],
  providers: [WalletService, SessionService, CookieService, AuthGuard],
  exports: [WalletService, TypeOrmModule],
})
export class WalletModule {}
