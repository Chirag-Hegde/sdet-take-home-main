import { test, expect } from '@fixtures/api.fixture';
import { RemindersApi } from './Reminders_API';
import { ReminderSchema } from './Reminders_Schema';
import { buildReminder } from './Reminders_Factory';

/**
 * POST /reminders/{id}/complete — happy path.
 *
 * Each test creates its own reminder to complete: completing a seeded record
 * would mutate shared state and break other tests' Open/Done expectations.
 *
 * Not covered here on purpose: completing an unknown id — the API returns
 * 200 with {} instead of 404 (known bug, see Reminders_KnownBugs.spec.ts).
 */
test.describe('Complete reminder', () => {
  test('marks an Open reminder as Done and persists it @Healthcheck', async ({ request }) => {
    const api = new RemindersApi(request);
    const created = ReminderSchema.parse(await (await api.create(buildReminder())).json());
    expect(created.status).toBe('Open');

    const response = await api.complete(created.id);
    await expect(response).toHaveApiStatus(200);
    const completed = ReminderSchema.parse(await response.json());
    expect(completed.id).toBe(created.id);
    expect(completed.status).toBe('Done');

    // The change must be visible on a fresh read, not just in the response.
    const fetched = ReminderSchema.parse(await (await api.getById(created.id)).json());
    expect(fetched.status).toBe('Done');
  });

  test('completing an already-Done reminder is idempotent', async ({ request }) => {
    const api = new RemindersApi(request);
    const created = ReminderSchema.parse(await (await api.create(buildReminder({ status: 'Done' }))).json());

    const response = await api.complete(created.id);
    await expect(response).toHaveApiStatus(200);
    expect(ReminderSchema.parse(await response.json()).status).toBe('Done');
  });
});
