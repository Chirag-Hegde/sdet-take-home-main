import { test, expect } from '@fixtures/api.fixture';
import { RemindersApi } from './Reminders_API';
import { ReminderListSchema } from './Reminders_Schema';

/**
 * GET /reminders — pagination, filtering, and sorting.
 *
 * All assertions here rely only on the 25 deterministic seeded records
 * (r-001..r-025). Records created elsewhere in the suite sort after the seed
 * (later createdAt and dueDate — see Reminders_Factory), so these tests are
 * stable under parallel runs against the shared, never-reset store.
 *
 * Not covered here on purpose: `order=desc` and the `total` field — both are
 * known bugs with dedicated Part B regression tests.
 */
test.describe('Reminders list @ReadOnly', () => {
  test('returns 200 and a well-formed list @Healthcheck', async ({ request }) => {
    const api = new RemindersApi(request);

    const response = await api.list({ page: 1, pageSize: 5 });
    await expect(response).toHaveApiStatus(200);

    const body = await response.json();
    // Validate the response shape, not just the status.
    ReminderListSchema.parse(body);
    expect(body.items.length).toBeGreaterThan(0);
  });

  test('applies defaults page=1 and pageSize=10 when no params are sent', async ({ request }) => {
    const api = new RemindersApi(request);
    const response = await api.list();
    await expect(response).toHaveApiStatus(200);

    const body = ReminderListSchema.parse(await response.json());
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(10);
    expect(body.items).toHaveLength(10);
  });

  test('consecutive pages are disjoint and continuous', async ({ request }) => {
    const api = new RemindersApi(request);
    const page1 = ReminderListSchema.parse(
      await (await api.list({ sort: 'createdAt', page: 1, pageSize: 5 })).json(),
    );
    const page2 = ReminderListSchema.parse(
      await (await api.list({ sort: 'createdAt', page: 2, pageSize: 5 })).json(),
    );

    expect(page1.items.map((r) => r.id)).toEqual(['r-001', 'r-002', 'r-003', 'r-004', 'r-005']);
    expect(page2.items.map((r) => r.id)).toEqual(['r-006', 'r-007', 'r-008', 'r-009', 'r-010']);
  });

  test('returns an empty items array for a page beyond the data', async ({ request }) => {
    const api = new RemindersApi(request);
    const response = await api.list({ page: 9999, pageSize: 10 });
    await expect(response).toHaveApiStatus(200);

    const body = ReminderListSchema.parse(await response.json());
    expect(body.items).toHaveLength(0);
  });

  test('falls back to defaults for non-numeric page and negative pageSize', async ({ request }) => {
    const api = new RemindersApi(request);
    const response = await api.list({ page: 'abc', pageSize: -5 });
    await expect(response).toHaveApiStatus(200);

    const body = ReminderListSchema.parse(await response.json());
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(10);
  });

  test.describe('status filter', () => {
    test('status=Open returns only Open reminders', async ({ request }) => {
      const api = new RemindersApi(request);
      const body = ReminderListSchema.parse(
        await (await api.list({ status: 'Open', pageSize: 100 })).json(),
      );
      expect(body.items.length).toBeGreaterThanOrEqual(20); // 20 seeded Open
      for (const item of body.items) expect(item.status).toBe('Open');
    });

    test('status=Done returns only Done reminders', async ({ request }) => {
      const api = new RemindersApi(request);
      const body = ReminderListSchema.parse(
        await (await api.list({ status: 'Done', pageSize: 100 })).json(),
      );
      expect(body.items.length).toBeGreaterThanOrEqual(5); // 5 seeded Done
      for (const item of body.items) expect(item.status).toBe('Done');
    });

    test('a status value outside Open/Done matches nothing', async ({ request }) => {
      // The contract only defines exact match on Open or Done; the API answers
      // other values with 200 and an empty list. Pinned here as observed behavior.
      const api = new RemindersApi(request);
      const response = await api.list({ status: 'Snoozed' });
      await expect(response).toHaveApiStatus(200);
      expect(ReminderListSchema.parse(await response.json()).items).toHaveLength(0);
    });
  });

  test.describe('sorting', () => {
    // ISO-8601 UTC strings compare lexicographically in chronological order,
    // so plain string comparison is a sound oracle here.
    test('sort=dueDate orders ascending by default', async ({ request }) => {
      const api = new RemindersApi(request);
      const body = ReminderListSchema.parse(
        await (await api.list({ sort: 'dueDate', pageSize: 25 })).json(),
      );
      const dates = body.items.map((r) => r.dueDate);
      expect(dates).toEqual([...dates].sort());
      expect(body.items[0].id).toBe('r-001'); // earliest seeded dueDate
    });

    test('sort=createdAt orders ascending by default', async ({ request }) => {
      const api = new RemindersApi(request);
      const body = ReminderListSchema.parse(
        await (await api.list({ sort: 'createdAt', pageSize: 25 })).json(),
      );
      const dates = body.items.map((r) => r.createdAt);
      expect(dates).toEqual([...dates].sort());
      expect(body.items[0].id).toBe('r-001'); // oldest seeded record
    });
  });
});
