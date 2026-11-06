# Reminders API Reference

Base URL: `http://localhost:3000`

All request and response bodies are JSON. The store holds 25 seeded reminders on startup and resets when the server restarts.

## The reminder object

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Server-generated, e.g. `r-001`. |
| `patientName` | string | Required on create. |
| `title` | string | Required on create, must be non-empty. |
| `notes` | string | Optional. Treat as sensitive: do not print it in test logs or reports. |
| `dueDate` | string | ISO 8601 date-time. Required on create. |
| `status` | string | `Open` or `Done`. Defaults to `Open`. |
| `createdAt` | string | ISO 8601 date-time, server-generated. |

## Endpoints

### `GET /health`

Returns `200` with `{ "status": "ok" }`. Used as a readiness check.

### `GET /reminders`

Returns a paginated list.

**Query parameters**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `page` | integer | `1` | 1-based page number. |
| `pageSize` | integer | `10` | Items per page. |
| `status` | string | (none) | Optional filter. Exact match on `Open` or `Done`. |
| `sort` | string | `createdAt` | Sort field: `dueDate` or `createdAt`. |
| `order` | string | `asc` | Sort direction: `asc` or `desc`. |

**Response** `200`

```json
{
  "items": [ /* array of reminder objects for this page */ ],
  "page": 1,
  "pageSize": 10,
  "total": 25
}
```

`total` is the total number of reminders that match the current filter, across all pages (not just the number returned on this page). A client uses it to work out how many pages exist.

### `GET /reminders/{id}`

Returns `200` with the reminder, or `404` with `{ "error": "..." }` if no reminder has that id.

### `POST /reminders`

Creates a reminder.

**Request body**

```json
{
  "patientName": "Ada Lovelace",
  "title": "Follow-up call",
  "notes": "optional",
  "dueDate": "2026-02-01T12:00:00.000Z",
  "status": "Open"
}
```

- `patientName`, `title`, and `dueDate` are required. `title` and `patientName` must be non-empty.
- `dueDate` must be a valid date.
- `status`, if provided, must be `Open` or `Done`.

**Responses**

- `201` with the created reminder (including its new `id` and `createdAt`).
- `400` with `{ "errors": [ ... ] }` if validation fails.

### `POST /reminders/{id}/complete`

Marks a reminder as `Done`.

**Responses**

- `200` with the updated reminder.
- `404` if no reminder has that id.
