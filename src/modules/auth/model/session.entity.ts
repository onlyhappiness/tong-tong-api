import { User } from '@/modules/user/model/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('session')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 로그인마다 userId 기준으로 기존 세션을 전량 삭제하므로 인덱스가 필요하다.
  @Index()
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // 원문 토큰은 저장하지 않는다. 쿠키로만 존재하고 DB에는 sha256 해시만 남는다.
  @Column({ unique: true })
  tokenHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
