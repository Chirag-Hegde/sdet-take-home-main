/**
 * Small helpers shared by k6 scenarios. The base URL points at the local
 * Reminders API. Override it with -e BASE_URL=... when running k6 if needed.
 */
// @ts-expect-error k6 provides __ENV at runtime
export const BASE_URL: string = (typeof __ENV !== 'undefined' && __ENV.BASE_URL) || 'http://localhost:3000';

export function url(path: string): string {
  return `${BASE_URL}${path}`;
}
