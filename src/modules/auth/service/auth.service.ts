import { ClientInfo } from '@/common/decorators/client-info.decorator';
import { PetService } from '@/modules/pet/service/pet.service';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../user/model/user.entity';
import { LoginDTO } from '../dto/login.dto';
import { SignupDTO } from '../dto/signup.dto';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { Account } from '../model/account.entity';
import { Wallet } from '@/modules/wallet/model/wallet.entity';
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userModel: Repository<User>,

    private readonly dataSource: DataSource,

    private readonly passwordService: PasswordService,

    private readonly sessionService: SessionService,

    private readonly petService: PetService,
  ) {}

  /**
   *
   * @param dto
   * @returns
   */
  async signup(
    dto: SignupDTO,
    clientInfo?: ClientInfo,
  ): Promise<{ user: User; token: string }> {
    const existing = await this.userModel.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('이미 사용중인 이메일입니다.');
    }

    const password = await this.passwordService.hash(dto.password);

    const user = await this.dataSource.transaction(async (manager) => {
      const created = await manager.getRepository(User).save(
        manager.getRepository(User).create({
          email: dto.email,
          emailVerified: false,
        }),
      );

      await manager.getRepository(Account).save(
        manager.getRepository(Account).create({
          userId: created.id,
          providerId: 'credential', // 기본 회원가입
          accountId: created.id,
          password,
        }),
      );

      await manager
        .getRepository(Wallet)
        .save(manager.getRepository(Wallet).create({ userId: created.id }));

      await this.petService.createEgg(created.id, manager);

      return created;
    });

    const token = await this.sessionService.create(user.id, clientInfo);

    return { user, token };
  }

  /**
   *
   */
  async login(
    dto: LoginDTO,
    clientInfo?: ClientInfo,
  ): Promise<{ user: User; token: string }> {
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

    const token = await this.sessionService.createExclusive(
      user.id,
      clientInfo,
    );
    return { user, token };
  }
}
