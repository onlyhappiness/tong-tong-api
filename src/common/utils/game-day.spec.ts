import { gameDay, gameDayStart, nextGameDay } from './game-day';

describe('gameDay', () => {
  it('treats 05:59 KST as the previous game day', () => {
    expect(gameDay(new Date('2026-07-30T05:59:00+09:00'))).toBe('2026-07-29');
  });

  it('starts a new game day exactly at 06:00 KST', () => {
    expect(gameDay(new Date('2026-07-30T06:00:00+09:00'))).toBe('2026-07-30');
  });

  it('keeps a past-midnight session on the previous game day', () => {
    expect(gameDay(new Date('2026-07-31T03:00:00+09:00'))).toBe('2026-07-30');
  });

  it('returns the same date during daytime', () => {
    expect(gameDay(new Date('2026-07-30T12:00:00+09:00'))).toBe('2026-07-30');
  });

  it('converts from UTC rather than the host timezone', () => {
    // 2026-07-29 21:00 UTC = 2026-07-30 06:00 KST
    expect(gameDay(new Date('2026-07-29T21:00:00Z'))).toBe('2026-07-30');
  });
});

describe('gameDayStart', () => {
  it('returns 06:00 KST of that date', () => {
    // KST 06:00 = UTC 전날 21:00
    expect(gameDayStart('2026-08-09').toISOString()).toBe(
      '2026-08-08T21:00:00.000Z',
    );
  });

  it('round-trips with gameDay', () => {
    expect(gameDay(gameDayStart('2026-08-09'))).toBe('2026-08-09');
  });
});

describe('nextGameDay', () => {
  it('advances one day', () => {
    expect(nextGameDay('2026-08-09')).toBe('2026-08-10');
  });

  it('crosses month and year boundaries', () => {
    expect(nextGameDay('2026-08-31')).toBe('2026-09-01');
    expect(nextGameDay('2026-12-31')).toBe('2027-01-01');
  });
});
