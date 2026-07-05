import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/model/user.entity';
import { LoginDTO } from '../dto/login.dto';
import { SignupDTO } from '../dto/signup.dto';
import { Account } from '../model/account.entity';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userModel: Repository<User>,

    @InjectRepository(Account)
    private readonly accountModel: Repository<Account>,

    private readonly passwordService: PasswordService,

    private readonly sessionService: SessionService,
  ) {}

  /**
   *
   * @param dto
   * @returns
   */
  async signup(dto: SignupDTO): Promise<{ user: User; token: string }> {
    const existing = await this.userModel.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('이미 사용중인 이메일입니다.');
    }

    const user = await this.userModel.save(
      this.userModel.create({ email: dto.email, emailVerified: false }),
    );

    const password = await this.passwordService.hash(dto.password);
    await this.accountModel.save(
      this.accountModel.create({
        userId: user.id,
        providerId: 'credential', // 기본 회원가입
        accountId: user.id,
        password,
      }),
    );

    const token = await this.sessionService.create(user.id);
    return { user, token };
  }

  /**
   *
   */
  async login(dto: LoginDTO): Promise<{ user: User; token: string }> {
    const user = await this.userModel.findOne({
      where: { email: dto.email },
      relations: { accounts: true },
    });
    const account = user?.accounts.find((a) => a.providerId === 'credential');

    if (!user || !account?.password) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    const valid = await this.passwordService.verify(
      account.password,
      dto.password,
    );
    if (!valid) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    const token = await this.sessionService.create(user.id);
    return { user, token };
  }
}
