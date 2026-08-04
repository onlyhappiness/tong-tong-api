import { User } from '@/modules/user/model/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum CoinReason {
  ATTENDANCE = 'ATTENDANCE',
  PETTING = 'PETTING',
  FEED = 'FEED',
}

@Entity('wallet_transaction')
@Index(['userId', 'createdAt'])
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('int')
  amount: number;

  @Column('int')
  balanceAfter: number;

  // Postgres enum 타입이 아니라 varchar다. synchronize: true에서 enum은
  // 값을 추가할 때마다 ALTER TYPE이 필요한데, varchar면 스키마 변경 비용이 0이고
  // 타입 안전성은 TypeScript enum이 컴파일 시점에 챙긴다.
  @Column({ type: 'varchar', length: 32 })
  reason: CoinReason;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
