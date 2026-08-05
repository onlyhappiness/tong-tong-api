import { Module } from '@nestjs/common';
import { AttendanceService } from './service/attendance.service';
import { AttendanceController } from './controller/attendance.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from './model/attendance.entity';
import { Session } from '../auth/model/session.entity';
import { User } from '../user/model/user.entity';
import { SessionService } from '../auth/service/session.service';
import { CookieService } from '../auth/service/cookie.service';
import { AuthGuard } from '@/common/guards/auth.guard';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance, Session, User]),
    WalletModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, SessionService, CookieService, AuthGuard],
})
export class AttendanceModule {}
