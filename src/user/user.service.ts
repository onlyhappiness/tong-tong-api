import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { omit } from 'es-toolkit';
import { Model } from 'mongoose';
import { User } from './domain/entity/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  /** 유저 id 조회 */
  async findUserById(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) return null;

    const userObject = user.toObject();
    return omit(userObject, ['password']);
  }

  /** 유저 이메일 조회 */
  async findUserByAccount(account: string) {
    const user = await this.userModel.findOne({ account });

    if (!user) return null;

    const userObject = user.toObject();
    return omit(userObject, ['password']);
  }
}
