import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Pet } from './pet.entity';

@Entity('pet_state')
export class PetState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  petId: string;

  @OneToOne(() => Pet, (pet) => pet.state, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pet_id' })
  pet: Pet;

  @Column({ default: 100 })
  hunger: number;

  @Column({ type: 'timestamptz', nullable: true })
  hungerUpdatedAt: Date | null;

  @Column({ default: 0 })
  intimacy: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastPettedAt: Date | null;

  @Column({ default: 0 })
  loveCount: number;

  @Column({ default: 0 })
  activeDayCount: number;

  @Column({ type: 'int', nullable: true })
  lastActivePeriod: number | null;

  @Column({ type: 'int', nullable: true })
  lastPettedPeriod: number | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
