import { test as base, expect as baseExpect, APIResponse } from '@playwright/test';

/**
 * Custom matcher: toHaveApiStatus.
 *
 * On failure it prints the endpoint, the expected and actual status, and a
 * short excerpt of the response body, so a failing test tells you what went
 * wrong without extra digging.
 *
 * Usage:  await expect(response).toHaveApiStatus(200);
 */
export const expect = baseExpect.extend({
  async toHaveApiStatus(response: APIResponse, expectedStatus: number) {
    const actualStatus = response.status();
    if (actualStatus === expectedStatus) {
      return { pass: true, message: () => '' };
    }
    const endpoint = new URL(response.url()).pathname;
    // `notes` is sensitive (API_REFERENCE.md): it must never appear in test output.
    const raw = (await response.text()).replace(
      /"notes"\s*:\s*"(?:[^"\\]|\\.)*"/g,
      '"notes":"<redacted>"',
    );
    const body = raw.trim().slice(0, 400) || '<empty response>';
    return {
      pass: false,
      message: () =>
        `API ${endpoint}\n` +
        `  Expected status: ${expectedStatus}\n` +
        `  Received status: ${actualStatus}\n` +
        `  Response body: ${body}`,
    };
  },
});

/**
 * The `api` fixture is an authenticated-style request context pointed at the
 * Reminders API base URL. For this exercise there is no real auth, so it is a
 * plain request context. In the real TC2 suite this is where per-user auth
 * state is attached.
 */
export const test = base;
