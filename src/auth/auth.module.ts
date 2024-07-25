import { JwtStrategy } from '@/common/jwt/jwt.strategy';
import { PointEntity } from '@/point/domain/entity/point.entity';
import { PointModule } from '@/point/point.module';
import { UserEntity } from '@/user/domain/entity/user.entity';
import { UserModule } from '@/user/user.module';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './controller/auth.controller';
import { AuthService } from './service/auth.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_TOKEN_SECRET,
      signOptions: { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME },
    }),
    TypeOrmModule.forFeature([UserEntity, PointEntity]),
    UserModule,
    PointModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
