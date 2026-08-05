import { isUniqueViolation } from './db-error';

describe('isUniqueViolation', () => {
  it('accepts a code copied onto the wrapper error', () => {
    expect(
      isUniqueViolation(Object.assign(new Error('dup'), { code: '23505' })),
    ).toBe(true);
  });

  it('accepts a code left on the driver error', () => {
    expect(isUniqueViolation({ driverError: { code: '23505' } })).toBe(true);
  });

  it('rejects a different constraint violation', () => {
    // 23503 = foreign_key_violation. 이것까지 true면 FK 버그가 400으로 위장된다.
    expect(
      isUniqueViolation(Object.assign(new Error('fk'), { code: '23503' })),
    ).toBe(false);
  });

  it('rejects an error with no code at all', () => {
    expect(isUniqueViolation(new Error('boom'))).toBe(false);
  });

  it('rejects null and undefined', () => {
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
  });
});
