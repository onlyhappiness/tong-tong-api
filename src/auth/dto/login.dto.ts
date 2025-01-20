import { User } from '@/user/domain/entity/user.entity';
import { PickType } from '@nestjs/swagger';

export class LoginUserDTO extends PickType(User, [
  'method',
  'account',
  'password',
] as const) {}
