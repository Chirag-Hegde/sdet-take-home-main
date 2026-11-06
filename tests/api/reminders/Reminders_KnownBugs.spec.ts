import { test, expect } from '@fixtures/api.fixture';
import { RemindersApi } from './Reminders_API';
import { ReminderListSchema, ValidationErrorSchema } from './Reminders_Schema';
import { buildReminder } from './Reminders_Factory';

/**
 * Part B — regression tests for the known bugs. Repros and root causes are in
 * NOTES.md ("Part B").
 *
 * Every test tagged @Bug FAILS TODAY, ON PURPOSE: each asserts the contract in
 * API_REFERENCE.md at exactly the point where the implementation breaks it.
 * Once a bug is fixed, its test goes green and becomes the guard that keeps it
 * fixed. Do not "fix" these tests to match current behavior.
 *
 *   npm run test:bugs    -> only these (expect 4 failures)
 *   npm run test:green   -> everything else (expect all green)
 *
 * Assertions are anchored on facts that cannot change mid-run — the 25 seeded
 * records are never deleted (no delete endpoint) and Done records are never
 * reopened — so these tests fail only because of the bugs, never because other
 * parallel tests created data.
 */
test.describe('Known bugs (intentionally failing)', () => {
  test('API is up and seeded @Healthcheck', async ({ request }) => {
    // Passing sanity check: when the @Bug tests below fail, it is the bugs,
    // not a dead server or missing seed.
    await expect(await request.get('/health')).toHaveApiStatus(200);
    await expect(await new RemindersApi(request).getById('r-001')).toHaveApiStatus(200);
  });

  test('BUG-1: list "total" is the count of all matches, not the page length @Bug', async ({ request }) => {
    const api = new RemindersApi(request);

    // Unfiltered: 25 seeded records always exist, so total >= 25.
    const paged = ReminderListSchema.parse(await (await api.list({ page: 1, pageSize: 5 })).json());
    expect(paged.items).toHaveLength(5);
    expect.soft(paged.total, 'unfiltered total collapses to the page length').toBeGreaterThanOrEqual(25);

    // Filtered: 5 seeded Done records always exist, so total >= 5.
    const filtered = ReminderListSchema.parse(await (await api.list({ status: 'Done', pageSize: 2 })).json());
    expect.soft(filtered.total, 'filtered total collapses to the page length').toBeGreaterThanOrEqual(5);

    // Out of range: an empty page must still report how much data exists.
    const beyond = ReminderListSchema.parse(await (await api.list({ page: 9999 })).json());
    expect.soft(beyond.total, 'total vanishes entirely on an out-of-range page').toBeGreaterThanOrEqual(25);
  });

  test('BUG-2: order=desc returns descending order @Bug', async ({ request }) => {
    const api = new RemindersApi(request);
    const body = ReminderListSchema.parse(
      await (await api.list({ sort: 'dueDate', order: 'desc', pageSize: 25 })).json(),
    );
    const dates = body.items.map((r) => r.dueDate);
    // ISO-8601 UTC strings compare chronologically; expected: non-increasing.
    // Actual today: ascending — the order param is parsed but never applied.
    expect(dates).toEqual([...dates].sort().reverse());
  });

  test('BUG-3: completing an unknown id returns 404 @Bug', async ({ request }) => {
    const api = new RemindersApi(request);
    const response = await api.complete('r-99999');
    // Actual today: 200 with an empty object {}.
    await expect(response).toHaveApiStatus(404);
  });

  test('BUG-4: creating with an empty title is rejected with 400 @Bug', async ({ request }) => {
    // Contract: title is required and must be non-empty. patientName gets a
    // trim check; title is only checked for undefined/null, so "" slips in.
    // (The non-string variant, e.g. title: 12345, is also accepted — repro in
    // NOTES.md. Not automated: the junk record it creates would poison every
    // schema-validating list test in the shared store for the whole run.)
    const api = new RemindersApi(request);
    const response = await api.create(buildReminder({ title: '' }));
    await expect(response).toHaveApiStatus(400); // actual today: 201, record is created
    const body = ValidationErrorSchema.parse(await response.json());
    expect(body.errors.join(' ')).toContain('title');
  });
});
