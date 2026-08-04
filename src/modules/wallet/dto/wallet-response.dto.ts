import { ApiProperty } from '@nestjs/swagger';

export class WalletResponseDTO {
  @ApiProperty({ example: 420, description: '보유 코인' })
  coins: number;
}
