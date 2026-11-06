import { randomUUID } from 'node:crypto';
import { ReminderInput } from './Reminders_API';

/**
 * Builds a valid create payload for POST /reminders.
 *
 * Isolation: the API's in-memory store is shared by all tests and never resets
 * mid-run, so every payload gets a unique patientName/title suffix — a test can
 * always recognise its own records and never asserts on absolute store counts.
 *
 * dueDate sits far after every seeded dueDate (2026-01-10 .. 2026-02-03), and
 * createdAt is server-stamped "now", so records this factory creates always
 * sort AFTER the 25 seeded ones — list/sort tests built on the seed stay stable.
 *
 * To drop a field in a negative test, override it with `undefined`: Playwright
 * serialises the body with JSON.stringify, which omits undefined keys.
 */
export function buildReminder(overrides: ReminderInput = {}): ReminderInput {
  const unique = randomUUID().slice(0, 8);
  return {
    patientName: `Test Patient ${unique}`,
    title: `Follow-up call ${unique}`,
    notes: 'placeholder note (non-sensitive test data)',
    dueDate: '2027-06-01T12:00:00.000Z',
    ...overrides,
  };
}
