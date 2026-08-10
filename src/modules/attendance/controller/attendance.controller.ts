import { AuthGuard } from '@/common/guards/auth.guard';
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AttendanceService } from '../service/attendance.service';
import { ApiSuccessResponse } from '@/common/decorators/api-success-response.decorator';
import { AttendanceStatusResponseDTO } from '../dto/attendance-status-response.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/user/model/user.entity';
import { AttendanceCheckInResponseDTO } from '../dto/attendance-check-in-response.dto';

@ApiTags('attendance')
@ApiCookieAuth('session_token')
@Controller('attendance')
@UseGuards(AuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @ApiOperation({ summary: '오늘 출석 여부 조회' })
  @ApiSuccessResponse(AttendanceStatusResponseDTO)
  @Get()
  async status(
    @CurrentUser() user: User,
  ): Promise<AttendanceStatusResponseDTO> {
    return {
      checkedIn: await this.attendanceService.hasCheckedInTodayForUser(
        user.id,
        new Date(),
      ),
    };
  }

  @ApiOperation({ summary: '출석 체크' })
  @ApiSuccessResponse(AttendanceCheckInResponseDTO, { status: 201 })
  @Post()
  checkIn(@CurrentUser() user: User): Promise<AttendanceCheckInResponseDTO> {
    return this.attendanceService.checkIn(user.id, new Date());
  }
}
