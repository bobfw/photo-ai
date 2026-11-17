export const UNAUTHORIZED = "UNAUTHORIZED";

export function isUnauthorized(error: unknown) {
  return error instanceof Error && error.message === UNAUTHORIZED;
}
