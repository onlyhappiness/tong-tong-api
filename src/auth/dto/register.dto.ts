import { User } from '@/user/domain/entity/user.entity';
import { PickType } from '@nestjs/swagger';

export class RegisterUserDTO extends PickType(User, [
  'method',
  'account',
  'email',
  'password',
  'username',
  'nickname',
] as const) {}
