import { UserEntity } from '@/user/domain/entity/user.entity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Repository } from 'typeorm';
import { PointEntity } from '../domain/entity/point.entity';
import { UsePointDto } from '../dto/UsePointDto';

@Injectable()
export class PointService {
  constructor(
    @InjectRepository(PointEntity)
    private readonly pointRepository: Repository<PointEntity>,
  ) {}

  /**
   * 유저 포인트 조회
   */
  async findPointByUser(userId: string) {
    const queryBuilder = this.pointRepository.createQueryBuilder('point');

    const userPoint = await queryBuilder
      .where('point.user_id = :userId', { userId })
      .getOne();

    return userPoint;
  }

  /**
   * 포인트 사용
   */
  async usePoints(currentUser: UserEntity, body: UsePointDto) {
    const { id: userId } = currentUser;

    const userPoint = await this.findPointByUser(userId);

    if (!userPoint) {
      throw new NotFoundException('포인트가 존재하지 않습니다.');
    }

    if (userPoint.point < body.point) {
      throw new BadRequestException('포인트가 적습니다.');
    }

    userPoint.point -= body.point;
    return await this.pointRepository.save(userPoint);
  }

  /**
   * 포인트 충전
   */
  async chargePoints(currentUser: UserEntity, body: UsePointDto) {
    const { id: userId } = currentUser;

    const userPoint = await this.findPointByUser(userId);

    if (!userPoint) {
      return await this.pointRepository.save({
        User: { id: userId },
        point: body.point,
      });
    }

    if (userPoint) {
      const point = {
        point: userPoint.point + body.point,
      };

      const chargePoint = plainToInstance(PointEntity, point);
      await this.pointRepository.update({ id: userPoint.id }, chargePoint);
      return await this.findPointByUser(userId);
    }
  }
}
