import { UserEntity } from '@/user/domain/entity/user.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Repository } from 'typeorm';
import { PetEntity, PetNatureEnum } from '../domain/entity/pet.entity';
import { CreatePetDTO } from '../dto/CreatePetDto';

@Injectable()
export class PetService {
  constructor(
    @InjectRepository(PetEntity)
    private readonly petRepository: Repository<PetEntity>,
  ) {}

  /**
   * 펫 성격 정하기
   */
  async getRandomNature() {
    const natures = Object.values(PetNatureEnum);
    const randomIndex = Math.floor(Math.random() * natures.length);
    return natures[randomIndex];
  }

  /**
   * 유저의 펫 조회
   */
  async findPetByUser(currentUser: UserEntity) {
    const { id: userId } = currentUser;

    const queryBuilder = this.petRepository.createQueryBuilder('pet');
    const userPet = await queryBuilder
      .where('pet.user_id = :userId', {
        userId,
      })
      .getMany();

    return userPet;
  }

  /**
   * 펫 구입
   */
  async createPetByUser(currentUser: UserEntity, body: CreatePetDTO) {
    const { id: userId } = currentUser;

    const petInfo = {
      User: userId,
      ...body,
      intimacy: 0,
      exp: 0,
      nature: await this.getRandomNature(),
    };
    const petInstance = plainToInstance(PetEntity, petInfo);

    const createPet = this.petRepository.create(petInstance);
    const pet = await this.petRepository.save(createPet);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { User: _, ...petWithoutUser } = pet;
    return petWithoutUser;
  }
}
