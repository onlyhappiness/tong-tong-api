import * as dayjs from 'dayjs';
import * as timezone from 'dayjs/plugin/timezone';
import * as utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * 게임 시간대.
 * 유저 타임존을 신뢰하지 않고 서버가 KST로 고정
 */
export const GAME_TIMEZONE = 'Asia/Seoul';

/**
 * 게임의 하루 경계
 */
export const GAME_DAY_START_HOUR = 6;

export function gameDay(now: Date): string {
  return dayjs(now)
    .tz(GAME_TIMEZONE)
    .subtract(GAME_DAY_START_HOUR, 'hour')
    .format('YYYY-MM-DD');
}
