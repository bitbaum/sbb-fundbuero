/**
 * The reporting flow's state, and the clock on it.
 *
 * Pure and framework-free so the rules are testable without rendering
 * anything. The React hook is a thin wrapper in components/report.
 *
 * TIME-TO-REPORT IS THE PRODUCT METRIC, so it is measured rather than hoped
 * for: the clock starts at the first interaction and stops at submit. Every
 * field is a cost against it, which is why so few of them are required.
 *
 * The README is explicit that we know of no published evidence that recovery
 * probability declines with time-to-report. Measuring it is how that stops
 * being an assumption — and if the number turns out not to matter, this is the
 * instrument that will say so.
 */

import { detectIdentifierKind } from './domain/identifiers';

export const REPORT_STEPS = ['journey', 'item', 'place', 'contact'] as const;
export type ReportStep = (typeof REPORT_STEPS)[number];

export interface ReportDraft {
  stationId: string | null;
  /** ISO 8601. Defaults to now, so the commonest case needs no input at all. */
  at: string | null;
  journeyId: string | null;
  /** Set when the passenger could not identify the journey. Not a failure. */
  journeyUnknown: boolean;

  category: string | null;
  description: string;
  identifierValue: string;
  colour: string;

  coach: string;
  seat: string;
  area: string | null;

  email: string;
  phone: string;
}

export function emptyDraft(now: Date): ReportDraft {
  return {
    stationId: null,
    at: now.toISOString(),
    journeyId: null,
    journeyUnknown: false,
    category: null,
    description: '',
    identifierValue: '',
    colour: '',
    coach: '',
    seat: '',
    area: null,
    email: '',
    phone: '',
  };
}

/**
 * Quick time offsets, in minutes ago.
 *
 * Someone who has just realised they left a bag on a train is not going to
 * operate a datetime picker on a moving vehicle. Four taps cover almost every
 * real case, and the default — now — covers the rest.
 */
export const TIME_OFFSETS_MINUTES = [0, 15, 30, 60] as const;

export function offsetToIso(now: Date, minutesAgo: number): string {
  return new Date(now.getTime() - minutesAgo * 60_000).toISOString();
}

/**
 * Can this step be left?
 *
 * Only the journey step and the item step gate progress, and even the journey
 * step lets someone through who does not know which train they were on — a
 * report that could not be bound to a trip is still worth having, and refusing
 * it would lose the report entirely.
 */
export function canAdvance(step: ReportStep, draft: ReportDraft): boolean {
  switch (step) {
    case 'journey':
      return Boolean(draft.stationId) && (Boolean(draft.journeyId) || draft.journeyUnknown);
    case 'item':
      return Boolean(draft.category) && draft.description.trim().length >= 3;
    case 'place':
      return true;
    case 'contact':
      return draft.email.trim().length > 0 || draft.phone.trim().length > 0;
  }
}

export function nextStep(step: ReportStep): ReportStep | null {
  const i = REPORT_STEPS.indexOf(step);
  return i >= 0 && i < REPORT_STEPS.length - 1 ? REPORT_STEPS[i + 1] : null;
}

export function previousStep(step: ReportStep): ReportStep | null {
  const i = REPORT_STEPS.indexOf(step);
  return i > 0 ? REPORT_STEPS[i - 1] : null;
}

/** The request body, built once, at the boundary. */
export function toRequestBody(draft: ReportDraft, locale: string) {
  const typed = draft.identifierValue.trim();

  // The KIND is detected, not assumed. One box that stored everything as
  // `serial` meant a passenger's IMEI never matched the same IMEI recorded by
  // staff — agreement compares kind and value — so the strongest signal in the
  // system was off, and it looked exactly like "no match found".
  const identifiers = typed.length > 0 ? [{ kind: detectIdentifierKind(typed), value: typed }] : [];

  return {
    journeyId: draft.journeyId,
    coach: draft.coach.trim() || null,
    seat: draft.seat.trim() || null,
    area: draft.area,
    // A loss is noticed at a moment but happens over a window. Half an hour
    // either side of the stated time is the honest reading of "about then",
    // and it is what the matcher compares against.
    lostFrom: draft.at ? new Date(Date.parse(draft.at) - 30 * 60_000).toISOString() : null,
    lostTo: draft.at ? new Date(Date.parse(draft.at) + 30 * 60_000).toISOString() : null,
    category: draft.category,
    description: draft.description.trim(),
    colour: draft.colour.trim() || null,
    identifiers,
    locale,
    contact: {
      email: draft.email.trim() || null,
      phone: draft.phone.trim() || null,
    },
  };
}

/**
 * The clock.
 *
 * `startedAt` is null until the first interaction, so a page someone left open
 * in a tab does not report a two-hour time-to-report. That is the difference
 * between a metric and a number.
 */
export interface ReportTiming {
  startedAt: number | null;
  submittedAt: number | null;
}

export function startTiming(timing: ReportTiming, now: number): ReportTiming {
  return timing.startedAt === null ? { ...timing, startedAt: now } : timing;
}

export function finishTiming(timing: ReportTiming, now: number): ReportTiming {
  return { ...timing, submittedAt: now };
}

export function elapsedSeconds(timing: ReportTiming): number | null {
  if (timing.startedAt === null || timing.submittedAt === null) return null;
  return Math.round((timing.submittedAt - timing.startedAt) / 1000);
}
