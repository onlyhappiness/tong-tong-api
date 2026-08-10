import { User } from '@/modules/user/model/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// 펫 상태 — 저장하지 않고 createdAt·releasedAt으로 계산한다 (stageOf).
export enum PetStage {
  EGG = 'EGG',
  HATCHED = 'HATCHED',
  EVOLVED = 'EVOLVED',
  RELEASED = 'RELEASED',
}

// 펫 종류 — 저장하지 않고 육성 기간 쓰다듬기 횟수로 계산한다 (speciesOf).
export enum Species {
  POODLE = 'POODLE',
  CAT = 'CAT',
  TURTLE = 'TURTLE',
}

/**
 * 펫. 사실만 담는다.
 *
 * stage·species·hatchedAt·evolvedAt은 컬럼이 아니다 — createdAt과 이벤트 기록에서
 * 매번 계산한다. 저장하면 조회가 쓰기가 되고, 계산 규칙이 바뀔 때 과거 행이
 * 옛 규칙으로 굳어버린다.
 */
@Entity('pet')
export class Pet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, (user) => user.pets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** 놓아준 시각. 유저의 행동이라 사실이다. */
  @Column({ type: 'timestamptz', nullable: true })
  releasedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
