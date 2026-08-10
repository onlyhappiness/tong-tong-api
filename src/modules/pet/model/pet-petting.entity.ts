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
 * 쓰다듬기 이벤트
 *
 * 한 번 쓰다듬을 때마다 한 행이 쌓인다.
 */
@Entity('pet_petting')
@Index(['petId', 'day'])
export class PetPetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  petId: string;

  @ManyToOne(() => Pet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pet_id' })
  pet: Pet;

  /** KST 06:00 경계의 'YYYY-MM-DD'. gameDay()가 만든 문자열을 그대로 넣는다. */
  @Column()
  day: string;

  @CreateDateColumn({ type: 'timestamptz' })
  pettedAt: Date;
}
