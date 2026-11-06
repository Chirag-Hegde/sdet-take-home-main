import { z } from 'zod';

/**
 * Schemas for the Reminders API responses (see API_REFERENCE.md).
 *
 * We validate the *shape and types* of responses, not just the status code.
 *
 * `title` is deliberately left as a plain string (not .min(1)): the server
 * currently accepts empty titles (a known bug, covered by a Part B regression
 * test), so a stricter schema here would make unrelated tests fail on data
 * that bug lets in. The non-empty contract is asserted behaviorally instead.
 */
export const ReminderSchema = z
  .object({
    id: z.string().regex(/^r-\d{3,}$/),
    patientName: z.string().min(1),
    title: z.string(),
    notes: z.string(),
    dueDate: z.string().datetime(),
    status: z.enum(['Open', 'Done']),
    createdAt: z.string().datetime(),
  })
  .strict();

export type Reminder = z.infer<typeof ReminderSchema>;

export const ReminderListSchema = z
  .object({
    items: z.array(ReminderSchema),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
  })
  .strict();

/** 404 body: { "error": "..." } */
export const NotFoundErrorSchema = z.object({ error: z.string() }).strict();

/** 400 body: { "errors": [ "..." ] } */
export const ValidationErrorSchema = z
  .object({ errors: z.array(z.string()).min(1) })
  .strict();
