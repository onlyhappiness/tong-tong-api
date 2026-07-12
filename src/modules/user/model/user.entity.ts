import { Account } from '@/modules/auth/model/account.entity';
import { Session } from '@/modules/auth/model/session.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Pet } from '@/modules/pet/model/pet.entity';
import { DailyLimit } from './daily-limit.entity';
import { Wallet } from './wallet.entity';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'varchar', nullable: true })
  image: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];

  @OneToMany(() => Account, (account) => account.user)
  accounts: Account[];

  @OneToOne(() => Wallet, (wallet) => wallet.user)
  wallet: Wallet;

  @OneToOne(() => DailyLimit, (dailyLimit) => dailyLimit.user)
  dailyLimit: DailyLimit;

  @OneToMany(() => Pet, (pet) => pet.user)
  pets: Pet[];
}
