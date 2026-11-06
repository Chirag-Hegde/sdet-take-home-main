'use strict';

/**
 * Reminders API — take-home target service.
 *
 * A small in-memory REST API. Data resets every time the server restarts.
 * Start it with:  npm run api   (listens on http://localhost:3000)
 *
 * You should not need to modify this file. Treat it as a black box and
 * test it through its HTTP surface. See API_REFERENCE.md for the contract.
 */

const express = require('express');
const { buildSeed } = require('./seed');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VALID_STATUSES = ['Open', 'Done'];
const SORTABLE_FIELDS = ['dueDate', 'createdAt'];

// In-memory store, reset on every start.
let reminders = buildSeed();
let nextId = reminders.length + 1;

function pad(n) {
  return String(n).padStart(3, '0');
}

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/reminders', (req, res) => {
  const { status } = req.query;
  const sort = SORTABLE_FIELDS.includes(req.query.sort) ? req.query.sort : 'createdAt';
  const order = req.query.order === 'desc' ? 'desc' : 'asc';

  let page = parseInt(req.query.page, 10);
  let pageSize = parseInt(req.query.pageSize, 10);
  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(pageSize) || pageSize < 1) pageSize = 10;

  let results = reminders.slice();

  if (status !== undefined) {
    results = results.filter((r) => r.status === status);
  }

  results.sort((a, b) => {
    if (a[sort] < b[sort]) return -1;
    if (a[sort] > b[sort]) return 1;
    return 0;
  });

  const start = (page - 1) * pageSize;
  const pageItems = results.slice(start, start + pageSize);

  res.status(200).json({
    items: pageItems,
    page,
    pageSize,
    total: pageItems.length,
  });
});

app.get('/reminders/:id', (req, res) => {
  const reminder = reminders.find((r) => r.id === req.params.id);
  if (!reminder) {
    return res.status(404).json({ error: 'Reminder not found' });
  }
  res.status(200).json(reminder);
});

app.post('/reminders', (req, res) => {
  const body = req.body || {};
  const errors = [];

  if (typeof body.patientName !== 'string' || body.patientName.trim() === '') {
    errors.push('patientName is required');
  }
  if (body.title === undefined || body.title === null) {
    errors.push('title is required');
  }
  if (typeof body.dueDate !== 'string' || Number.isNaN(Date.parse(body.dueDate))) {
    errors.push('dueDate must be a valid date');
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    errors.push(`status must be one of ${VALID_STATUSES.join(', ')}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const reminder = {
    id: `r-${pad(nextId++)}`,
    patientName: body.patientName,
    title: body.title,
    notes: typeof body.notes === 'string' ? body.notes : '',
    dueDate: new Date(body.dueDate).toISOString(),
    status: body.status || 'Open',
    createdAt: new Date().toISOString(),
  };

  reminders.push(reminder);
  res.status(201).json(reminder);
});

app.post('/reminders/:id/complete', (req, res) => {
  const reminder = reminders.find((r) => r.id === req.params.id);
  if (reminder) {
    reminder.status = 'Done';
  }
  res.status(200).json(reminder || {});
});

if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Reminders API listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
