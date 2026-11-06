import { APIRequestContext } from '@playwright/test';

/**
 * Thin wrapper around the Reminders API endpoints.
 *
 * Keeping the HTTP calls in one place (instead of scattering `request.get`
 * through the specs) is the pattern we use across the real suite. Extend this
 * as you add coverage.
 */
export interface ReminderInput {
  patientName?: unknown;
  title?: unknown;
  notes?: unknown;
  dueDate?: unknown;
  status?: unknown;
}

export class RemindersApi {
  constructor(private readonly request: APIRequestContext) {}

  list(query: Record<string, string | number> = {}) {
    const params = new URLSearchParams(
      Object.entries(query).map(([k, v]) => [k, String(v)]),
    ).toString();
    const suffix = params ? `?${params}` : '';
    return this.request.get(`/reminders${suffix}`);
  }

  getById(id: string) {
    return this.request.get(`/reminders/${id}`);
  }

  create(body: ReminderInput) {
    return this.request.post('/reminders', { data: body });
  }

  complete(id: string) {
    return this.request.post(`/reminders/${id}/complete`);
  }
}
