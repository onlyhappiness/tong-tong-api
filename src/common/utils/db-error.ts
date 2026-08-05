/**
 * Postgres SQLSTATE.
 * https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export const PG_UNIQUE_VIOLATION = '23505';

function sqlState(err: unknown): string | undefined {
  const error = err as { code?: string; driverError?: { code?: string } };
  return error?.driverError?.code ?? error?.code;
}

export function isUniqueViolation(err: unknown): boolean {
  return sqlState(err) === PG_UNIQUE_VIOLATION;
}
