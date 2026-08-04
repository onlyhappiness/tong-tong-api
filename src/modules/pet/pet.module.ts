import { AuthGuard } from '@/common/guards/auth.guard';
import { Session } from '@/modules/auth/model/session.entity';
import { CookieService } from '@/modules/auth/service/cookie.service';
import { SessionService } from '@/modules/auth/service/session.service';
import { User } from '@/modules/user/model/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PetController } from './controller/pet.controller';
import { PetState } from './model/pet-state.entity';
import { Pet } from './model/pet.entity';
import { PetService } from './service/pet.service';

// AuthGuard(→ SessionService → Session repo)를 cross-module export/import로 공유하려 했으나
// 이 프로젝트의 NestJS+webpack 조합에서 재현 가능한 DI 해석 실패가 있어(원인 미확정),
// 기존 코드베이스 컨벤션(엔티티 중복 등록)과 동일하게 이 모듈에서도 직접 등록함.
@Module({
  imports: [TypeOrmModule.forFeature([Pet, PetState, User, Session])],
  controllers: [PetController],
  providers: [PetService, SessionService, CookieService, AuthGuard],
  exports: [PetService, TypeOrmModule],
})
export class PetModule {}
