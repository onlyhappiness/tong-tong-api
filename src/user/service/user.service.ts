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
      throw new UnauthorizedException('이메일과 비밀번호를 다시 확인해주세요.');
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
      throw new UnauthorizedException('이메일과 비밀번호를 다시 확인해주세요.');
    }
    return user;
  }
}
