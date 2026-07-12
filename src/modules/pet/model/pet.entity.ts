import { User } from '@/modules/user/model/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PetState } from './pet-state.entity';

// 펫 상태
export enum PetStage {
  EGG = 'EGG',
  HATCHED = 'HATCHED',
  EVOLVED = 'EVOLVED',
  RELEASED = 'RELEASED',
}

// 펫 종류
export enum Species {
  POODLE = 'POODLE',
  CAT = 'CAT',
  TURTLE = 'TURTLE',
}

@Entity('pet')
export class Pet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, (user) => user.pets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: PetStage, default: PetStage.EGG })
  stage: PetStage;

  @Column({ type: 'enum', enum: Species, nullable: true })
  hatchedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  evolvedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  releasedAt: Date | null;

  @OneToOne(() => PetState, (state) => state.pet)
  state: PetState;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
