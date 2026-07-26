import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PetService } from '@/modules/pet/pet.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyLimit } from '../../user/model/daily-limit.entity';
import { User } from '../../user/model/user.entity';
import { Wallet } from '../../user/model/wallet.entity';
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

    @InjectRepository(Wallet)
    private readonly walletModel: Repository<Wallet>,

    @InjectRepository(DailyLimit)
    private readonly dailyLimitModel: Repository<DailyLimit>,

    private readonly passwordService: PasswordService,

    private readonly sessionService: SessionService,

    private readonly petService: PetService,
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

    await this.walletModel.save(
      this.walletModel.create({ userId: user.id, coins: 0 }),
    );

    await this.dailyLimitModel.save(
      this.dailyLimitModel.create({
        userId: user.id,
        day: new Date().toISOString().slice(0, 10),
      }),
    );

    await this.petService.createEgg(user.id);

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
