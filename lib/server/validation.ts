/**
 * Validation at the system boundary, once.
 *
 * Everything past a successful parse here is trusted by the rest of the
 * server, which is only true if nothing bypasses it. So the route handlers
 * take `unknown` and call these, rather than reading fields off a body.
 *
 * Note `.strict()` on every object: zod's default STRIPS unknown keys
 * silently, which turns "the client sent a field we removed last week" into
 * "the field vanished" — a data-loss bug that looks like nothing at all.
 * Rejecting is louder and cheaper.
 */

import { z } from 'zod';

import { IDENTIFIER_KINDS } from '@/lib/domain/identifiers';
// One definition of the closed sets, shared with the UI that renders them.
// Two lists would drift, and the drift would look like a passenger sending an
// invalid category rather than like the bug it is.
export { AREAS, CATEGORIES } from '@/lib/report-options';
import { AREAS, CATEGORIES } from '@/lib/report-options';

export const LOCALES = ['de', 'fr', 'it', 'en'] as const;

const identifierInput = z
  .object({
    kind: z.enum(IDENTIFIER_KINDS),
    value: z.string().min(1).max(120),
  })
  .strict();

/**
 * A report is intentionally small. Time-to-report is the product metric and
 * every field is a cost against it, so anything not required to FIND the item
 * is optional — including, deliberately, the journey: a report that could not
 * be bound to a trip is still worth having.
 */
export const createReportInput = z
  .object({
    journeyId: z.string().uuid().nullish(),
    coach: z.string().max(20).nullish(),
    seat: z.string().max(20).nullish(),
    area: z.enum(AREAS).nullish(),
    lostFrom: z.string().datetime().nullish(),
    lostTo: z.string().datetime().nullish(),
    category: z.enum(CATEGORIES),
    description: z.string().min(3).max(500),
    colour: z.string().max(60).nullish(),
    brand: z.string().max(60).nullish(),
    identifiers: z.array(identifierInput).max(10).default([]),
    locale: z.enum(LOCALES).default('de'),
    contact: z
      .object({
        email: z.string().email().max(320).nullish(),
        phone: z.string().max(40).nullish(),
      })
      .strict()
      .refine((c) => Boolean(c.email || c.phone), {
        message: 'Give an email address or a phone number, or we cannot tell you if it turns up.',
      }),
  })
  .strict()
  .refine((r) => !r.lostFrom || !r.lostTo || Date.parse(r.lostTo) >= Date.parse(r.lostFrom), {
    message: 'The end of the time window is before its start.',
    path: ['lostTo'],
  });

export type CreateReportInput = z.infer<typeof createReportInput>;

export const createFoundItemInput = z
  .object({
    journeyId: z.string().uuid().nullish(),
    coach: z.string().max(20).nullish(),
    seat: z.string().max(20).nullish(),
    area: z.enum(AREAS).nullish(),
    foundAt: z.string().datetime(),
    custodyLocation: z.string().min(1).max(200),
    category: z.enum(CATEGORIES),
    description: z.string().min(3).max(500),
    colour: z.string().max(60).nullish(),
    brand: z.string().max(60).nullish(),
    estimatedValueChf: z.number().nonnegative().max(1_000_000).nullish(),
    identifiers: z.array(identifierInput).max(10).default([]),
  })
  .strict();

export type CreateFoundItemInput = z.infer<typeof createFoundItemInput>;

export const suggestTripsInput = z
  .object({
    stopId: z.string().min(1).max(120),
    at: z.string().datetime(),
    windowMinutes: z.coerce.number().int().min(5).max(180).optional(),
  })
  .strict();

/**
 * A uniform failure shape. `details` names the field, because "invalid input"
 * on a form somebody is filling in on a moving train is not an error message,
 * it is an obstacle.
 */
export interface ApiError {
  success: false;
  error: string;
  details?: { path: string; message: string }[];
}

export function badRequest(error: z.ZodError): ApiError {
  return {
    success: false,
    error: 'The report could not be accepted as sent.',
    details: error.issues.map((i) => ({
      path: i.path.join('.') || '(root)',
      message: i.message,
    })),
  };
}
