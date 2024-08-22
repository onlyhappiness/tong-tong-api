import { UserEntity } from '@/user/domain/entity/user.entity';
import { PickType } from '@nestjs/swagger';

export class LoginUserDTO extends PickType(UserEntity, [
  'method',
  'account',
  'password',
] as const) {}
