import { ApiSuccessResponse } from '@/common/decorators/api-success-response.decorator';
import { AuthGuard } from '@/common/guards/auth.guard';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WalletService } from '../service/wallet.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/user/model/user.entity';
import { WalletResponseDTO } from '../dto/wallet-response.dto';

@ApiTags('wallet')
@ApiCookieAuth('session_token')
@Controller('wallet')
@UseGuards(AuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @ApiOperation({ summary: '내 코인 잔액 확인하기' })
  @ApiSuccessResponse(WalletResponseDTO)
  @Get('')
  async me(@CurrentUser() user: User): Promise<WalletResponseDTO> {
    return { coins: await this.walletService.balanceForUser(user.id) };
  }
}
