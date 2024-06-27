import { BaseEntity } from '@/common/BaseEntity';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'exp' })
export class ExpEntity extends BaseEntity {
  @IsInt()
  @Min(0)
  @Max(100)
  @ApiProperty({ description: '경험치' })
  @Column({ type: 'int' })
  exp: number;
}
