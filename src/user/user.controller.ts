import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';

@ApiTags('USER 관련')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
}
