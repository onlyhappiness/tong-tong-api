import { ApiProperty } from '@nestjs/swagger';

export class AttendanceStatusResponseDTO {
  @ApiProperty({ example: false, description: '오늘 출석 받았는지' })
  checkedIn: boolean;
}
