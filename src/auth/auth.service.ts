import { User } from '@/user/domain/entity/user.entity';
import { UserService } from '@/user/user.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { omit } from 'es-toolkit';
import { Model } from 'mongoose';
import { LoginUserDTO } from './dto/login.dto';
import { RegisterUserDTO } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,

    private readonly jwtService: JwtService,

    private readonly userService: UserService,
  ) {}

  /** 회원가입 */
  async createUser(body: RegisterUserDTO) {
    const { password } = body;

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.userModel.create({
      ...body,
      password: hashedPassword,
    });

    return omit(user.toObject(), ['password']);
  }

  /** 로그인 */
  async login(body: LoginUserDTO) {
    const { account, password } = body;

    const user = await this.userModel.findOne({ account });
    if (!user) {
      throw new BadRequestException(
        '아이디 또는 비밀번호를 다시 확인해주세요.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException(
        '아이디 또는 비밀번호를 다시 확인해주세요.',
      );
    }

    const token = this.jwtService.sign(body, {
      secret: process.env.JWT_TOKEN_SECRET,
    });

    return { token };
  }
}
