import { UserEntity } from '@/user/domain/entity/user.entity';
import { UserService } from '@/user/service/user.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { LoginUserDTO } from '../dto/LoginUserDto';
import { RegisterUserDTO } from '../dto/RegisterUserDto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  /**
   * 회원가입
   */
  async createUser(body: RegisterUserDTO) {
    const hashedPassword = await bcrypt.hash(body.password, 12);

    const user = await this.userRepository.save({
      ...body,
      password: hashedPassword,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...withoutPassword } = user;
    return withoutPassword;
  }

  /**
   * 로그인
   */
  async loginUser(body: LoginUserDTO) {
    const { email, password } = body;

    const user = await this.userService.findUserByEmail(email);

    const isPasswordValidated = await bcrypt.compare(password, user.password);
    if (!isPasswordValidated) {
      throw new UnauthorizedException('이메일과 비밀번호를 다시 확인해주세요.');
    }

    const access_token = this.jwtService.sign(body, {
      secret: process.env.JWT_ACESS_TOKEN_SECRET,
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME,
    });

    return { access_token };
  }
}
