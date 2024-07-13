import { BaseEntity } from '@/common/BaseEntity';
import { UserEntity } from '@/user/domain/entity/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity({ name: 'point' })
export class PointEntity extends BaseEntity {
  @Column({ type: 'int' })
  @IsInt()
  @Min(0)
  @Max(9999999)
  @ApiProperty({ description: '포인트' })
  point: number;

  @ManyToOne(() => UserEntity, (user) => user.Point, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  User: UserEntity;
}
