import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FarmEntity } from '../domain/entity/farm.entity';

@Injectable()
export class FarmService {
  constructor(
    @InjectRepository(FarmEntity)
    private readonly farmRepository: Repository<FarmEntity>,
  ) {}

  /**
   * 유저의 농장 조회
   */
  async findFarmByUser(currentUser) {
    const { id: userId } = currentUser;

    const queryBuilder = this.farmRepository.createQueryBuilder('farm');
    const userFarm = await queryBuilder
      .where('farm.user_id = :userId', { userId })
      .getOne();

    return userFarm;
  }

  /**
   * 농장 설정
   */
  async createUserFarm(currentUser, body) {
    const { id: userId } = currentUser;

    const farmInfo = {
      User: userId,
      ...body,
    };

    const createFarm = this.farmRepository.create(farmInfo);
    const farm = await this.farmRepository.save(createFarm);
    return farm;
  }
}
