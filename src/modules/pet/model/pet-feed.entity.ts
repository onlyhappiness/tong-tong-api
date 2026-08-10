import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Pet } from './pet.entity';

/**
 * 밥 주기 이벤트 + 배고픔 체크포인트
 */
@Entity('pet_feed')
@Index(['petId', 'fedAt'])
export class PetFeed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  petId: string;

  @ManyToOne(() => Pet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pet_id' })
  pet: Pet;

  /** 이 밥을 준 직후의 배고픔. 다음 계산의 기준선이 된다. */
  @Column('int')
  hungerAfter: number;

  @CreateDateColumn({ type: 'timestamptz' })
  fedAt: Date;
}
