import { UserEntity } from '@/user/domain/entity/user.entity';
import { PickType } from '@nestjs/swagger';

export class RegisterUserDTO extends PickType(UserEntity, [
  'method',
  'email',
  'nickname',
  'username',
  'password',
  //   'phone',
] as const) {}
