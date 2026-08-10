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

/**
 * 게임 하루가 시작하는 실제 시각. 'YYYY-MM-DD' → 그날 KST 06:00.
 *
 * 문자열을 KST로 파싱하는 것이 핵심이다. new Date('2026-08-09 06:00')은
 * 실행 환경 시간대로 해석되어 서버 로케일에 따라 값이 달라진다.
 */
export function gameDayStart(day: string): Date {
  return dayjs.tz(`${day} 06:00:00`, GAME_TIMEZONE).toDate();
}

/** 다음 게임 하루의 날짜 문자열. 월말·연말을 dayjs가 처리한다. */
export function nextGameDay(day: string): string {
  return dayjs(day).add(1, 'day').format('YYYY-MM-DD');
}
