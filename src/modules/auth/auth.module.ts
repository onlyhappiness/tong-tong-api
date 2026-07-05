import { AuthGuard } from '@/common/guards/auth.guard';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/model/user.entity';
import { UserModule } from '../user/user.module';
import { AuthController } from './controller/auth.controller';
import { Account } from './model/account.entity';
import { Session } from './model/session.entity';
import { Verification } from './model/verification.entity';
import { AuthService } from './service/auth.service';
import { CookieService } from './service/cookie.service';
import { PasswordService } from './service/password.service';
import { SessionService } from './service/session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Account, Session, Verification]),
    UserModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    SessionService,
    CookieService,
    AuthGuard,
  ],
})
export class AuthModule {}
