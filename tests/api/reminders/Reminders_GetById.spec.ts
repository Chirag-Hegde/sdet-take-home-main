import { test, expect } from '@fixtures/api.fixture';
import { RemindersApi } from './Reminders_API';
import { ReminderSchema, NotFoundErrorSchema } from './Reminders_Schema';

/**
 * GET /reminders/{id} — fetch one reminder, and the 404 contract.
 * r-001 is seeded deterministically (see api/seed.js) and never mutated by
 * this suite, so its fields are a stable oracle.
 */
test.describe('Fetch reminder by id @ReadOnly', () => {
  test('returns a seeded reminder matching the contract shape @Healthcheck', async ({ request }) => {
    const api = new RemindersApi(request);
    const response = await api.getById('r-001');
    await expect(response).toHaveApiStatus(200);

    const reminder = ReminderSchema.parse(await response.json());
    expect(reminder).toMatchObject({
      id: 'r-001',
      patientName: 'Ada Lovelace',
      title: 'Reminder 1',
      status: 'Open',
    });
  });

  test('returns 404 with an error body for an unknown id', async ({ request }) => {
    const api = new RemindersApi(request);
    const response = await api.getById('r-99999');
    await expect(response).toHaveApiStatus(404);
    NotFoundErrorSchema.parse(await response.json());
  });

  test('does not match an unpadded id variant', async ({ request }) => {
    // ids are exact strings: "r-1" must not resolve to "r-001".
    const api = new RemindersApi(request);
    const response = await api.getById('r-1');
    await expect(response).toHaveApiStatus(404);
  });
});
