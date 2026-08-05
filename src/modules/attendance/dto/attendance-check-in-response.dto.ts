import { ApiProperty } from '@nestjs/swagger';

export class AttendanceCheckInResponseDTO {
  @ApiProperty({ example: 200, description: '이번에 지급된 코인' })
  amount: number;

  @ApiProperty({ example: 620, description: '지급 후 잔액' })
  coins: number;
}
