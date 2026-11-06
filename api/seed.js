'use strict';

/**
 * Deterministic seed data for the Reminders API.
 *
 * The data is intentionally fixed (no randomness) so that tests written
 * against it are stable and reproducible from one run to the next.
 *
 * 25 reminders, ids r-001 .. r-025:
 *   - createdAt increases by one minute per record (r-001 is oldest)
 *   - dueDate increases by one day per record
 *   - every 5th reminder (r-005, r-010, ...) starts as "Done", the rest "Open"
 */

const PATIENTS = [
  'Ada Lovelace',
  'Alan Turing',
  'Grace Hopper',
  'Katherine Johnson',
  'Edsger Dijkstra',
];

function pad(n) {
  return String(n).padStart(3, '0');
}

function buildSeed() {
  const createdBase = Date.UTC(2026, 0, 1, 9, 0, 0); // 2026-01-01T09:00:00Z
  const dueBase = Date.UTC(2026, 0, 10, 12, 0, 0); // 2026-01-10T12:00:00Z
  const reminders = [];

  for (let i = 1; i <= 25; i++) {
    const createdAt = new Date(createdBase + (i - 1) * 60 * 1000).toISOString();
    const dueDate = new Date(dueBase + (i - 1) * 24 * 60 * 60 * 1000).toISOString();
    reminders.push({
      id: `r-${pad(i)}`,
      patientName: PATIENTS[(i - 1) % PATIENTS.length],
      title: `Reminder ${i}`,
      notes: `Internal note for reminder ${i}`,
      dueDate,
      status: i % 5 === 0 ? 'Done' : 'Open',
      createdAt,
    });
  }

  return reminders;
}

module.exports = { buildSeed };
