import { PetService } from '@/pet/service/pet.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../domain/entity/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    private readonly petService: PetService,
  ) {}

  /**
   * id로 유저 찾기
   */
  async findUserById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new UnauthorizedException('아이디와 비밀번호를 다시 확인해주세요.');
    }
    return user;
  }

  /**
   * 이메일로 유저 찾기
   */
  async findUserByEmail(email: string) {
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password'],
    });

    if (!user) {
      throw new UnauthorizedException('이메일을 다시 확인해주세요.');
    }
    return user;
  }

  /**
   * 유저 계정 찾기
   */
  async findUserByAccount(account: string) {
    const user = await this.userRepository.findOne({
      where: { account },
      select: ['id', 'account', 'password'],
    });

    if (!user) {
      throw new UnauthorizedException('아이디와 비밀번호를 다시 확인해주세요.');
    }
    return user;
  }

  /**
   * 유저 닉네임 중복 확인
   */
  async nicknameDuplicatedCheck(nickname: string) {
    const user = await this.userRepository.findOne({
      where: { nickname },
    });

    return user ? true : false;
  }

  /**
   * 유저 이메일 중복 확인
   */
  async emailDuplicatedCheck(email: string) {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    return user ? true : false;
  }

  /**
   * 유저 계정 중복 확인
   */
  async accountDuplicatedCheck(account: string) {
    const user = await this.userRepository.findOne({
      where: { account },
    });

    return user ? true : false;
  }
}
