import { test, expect } from '@fixtures/api.fixture';
import { RemindersApi } from './Reminders_API';
import { ReminderSchema, ValidationErrorSchema } from './Reminders_Schema';
import { buildReminder } from './Reminders_Factory';

/**
 * POST /reminders — happy path, defaults, and validation (400) cases.
 *
 * The `notes` value is never asserted with a plain equality (a failure diff
 * would print it); the round-trip check compares it as a boolean instead.
 *
 * Not covered here on purpose: empty/non-string `title` — the API wrongly
 * accepts those (known bug, covered by a Part B regression test).
 */
test.describe('Create reminder', () => {
  test('creates a reminder and returns it with server-generated fields @Healthcheck', async ({ request }) => {
    const api = new RemindersApi(request);
    const payload = buildReminder();

    const response = await api.create(payload);
    await expect(response).toHaveApiStatus(201);

    const created = ReminderSchema.parse(await response.json());
    expect(created).toMatchObject({
      patientName: payload.patientName,
      title: payload.title,
      dueDate: payload.dueDate,
      status: 'Open', // status not sent -> contract default
    });
  });

  test('a created reminder is retrievable by its new id', async ({ request }) => {
    const api = new RemindersApi(request);
    const created = ReminderSchema.parse(await (await api.create(buildReminder())).json());

    const response = await api.getById(created.id);
    await expect(response).toHaveApiStatus(200);
    const fetched = ReminderSchema.parse(await response.json());

    const { notes: createdNotes, ...createdRest } = created;
    const { notes: fetchedNotes, ...fetchedRest } = fetched;
    expect(fetchedRest).toEqual(createdRest);
    expect(fetchedNotes === createdNotes, 'notes should round-trip (value redacted)').toBe(true);
  });

  test('accepts an explicit status of Done', async ({ request }) => {
    const api = new RemindersApi(request);
    const response = await api.create(buildReminder({ status: 'Done' }));
    await expect(response).toHaveApiStatus(201);
    expect(ReminderSchema.parse(await response.json()).status).toBe('Done');
  });

  test.describe('validation', () => {
    const invalidCases = [
      { name: 'missing patientName', overrides: { patientName: undefined }, mentions: 'patientName' },
      { name: 'whitespace-only patientName', overrides: { patientName: '   ' }, mentions: 'patientName' },
      { name: 'missing title', overrides: { title: undefined }, mentions: 'title' },
      { name: 'missing dueDate', overrides: { dueDate: undefined }, mentions: 'dueDate' },
      { name: 'unparseable dueDate', overrides: { dueDate: 'not-a-date' }, mentions: 'dueDate' },
      { name: 'status outside Open/Done', overrides: { status: 'Snoozed' }, mentions: 'status' },
    ];

    for (const { name, overrides, mentions } of invalidCases) {
      test(`rejects ${name} with 400`, async ({ request }) => {
        const api = new RemindersApi(request);
        const response = await api.create(buildReminder(overrides));
        await expect(response).toHaveApiStatus(400);

        const body = ValidationErrorSchema.parse(await response.json());
        expect(body.errors.join(' ')).toContain(mentions);
      });
    }

    test('rejects an empty body with one error per required field', async ({ request }) => {
      const api = new RemindersApi(request);
      const response = await api.create({});
      await expect(response).toHaveApiStatus(400);

      const { errors } = ValidationErrorSchema.parse(await response.json());
      const joined = errors.join(' ');
      expect(joined).toContain('patientName');
      expect(joined).toContain('title');
      expect(joined).toContain('dueDate');
    });
  });
});
