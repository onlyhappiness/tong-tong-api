import { gameDay } from './game-day';

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
