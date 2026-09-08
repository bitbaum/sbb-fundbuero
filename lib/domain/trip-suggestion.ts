/**
 * "Which train were you on?" answered without asking.
 *
 * Task 4 of the rebuild: from a place and a time, propose the likely journeys
 * and let the passenger confirm one, so a report binds to a real journey
 * identifier instead of to a sentence. The incumbent operator's own
 * loss-report form takes the route as FREE TEXT — "Entire route incl. transfer
 * points", with a placeholder listing station names — and has no train-number
 * field at all. That gap is the entire reason this function exists.
 *
 * The database finds candidates; this ranks them. Ranking is pure so it can be
 * tested without a timetable, and so the rule that decides what a passenger
 * sees first is one readable function rather than an ORDER BY nobody reviews.
 *
 * Deliberately NOT here: any attempt to guess the journey without asking. The
 * passenger confirms. A report silently bound to the wrong train is worse than
 * an unbound one, because it looks like data.
 */

export interface CandidateJourney {
  journeyId: string;
  sjyid: string;
  operatingDate: string;
  /** What a passenger can read off a departure board. May be absent. */
  trainNumber: string | null;
  line: string | null;
  originName: string | null;
  destinationName: string | null;
  /** When this journey called at the stop the passenger named. ISO 8601. */
  calledAt: string;
  /** True when the call time came from actual data rather than the timetable. */
  actual?: boolean;
}

export interface RankedJourney extends CandidateJourney {
  /** Signed minutes from the passenger's stated time. Negative = earlier. */
  offsetMinutes: number;
  /** Lower is better. Exposed so the ordering is inspectable, not magic. */
  distance: number;
  reason: string;
}

export interface SuggestionOptions {
  /**
   * How far either side of the stated time to consider.
   *
   * Wide on purpose. People say "about half past" and mean anything from 14:20
   * to 14:45, and a passenger who cannot find their train in the list has to
   * fall back to free text — which is the failure mode we are removing.
   */
  windowMinutes?: number;
  limit?: number;
}

const DEFAULTS = { windowMinutes: 45, limit: 5 } as const;

/**
 * A journey that departed BEFORE the stated time is likelier than one after
 * it by the same margin: people notice a loss after boarding, and they report
 * the time they noticed, not the time they boarded. So lateness is penalised
 * more than earliness.
 */
const LATE_PENALTY = 1.6;

export function rankCandidates(
  candidates: readonly CandidateJourney[],
  statedTime: Date,
  options: SuggestionOptions = {},
): RankedJourney[] {
  const windowMinutes = options.windowMinutes ?? DEFAULTS.windowMinutes;
  const limit = options.limit ?? DEFAULTS.limit;
  const stated = statedTime.getTime();

  const ranked: RankedJourney[] = [];

  for (const c of candidates) {
    const called = Date.parse(c.calledAt);
    if (Number.isNaN(called)) continue;

    const offsetMinutes = Math.round((called - stated) / 60000);
    if (Math.abs(offsetMinutes) > windowMinutes) continue;

    const magnitude = Math.abs(offsetMinutes);
    let distance = offsetMinutes > 0 ? magnitude * LATE_PENALTY : magnitude;

    // A call time from actual data beats one from the timetable: the train
    // that really ran is the one the passenger was on.
    if (c.actual) distance -= 2;

    ranked.push({
      ...c,
      offsetMinutes,
      distance,
      reason: describe(offsetMinutes, c.actual === true),
    });
  }

  // Stable order for equal distances: earlier call first, then sjyid, so the
  // list a passenger sees does not reshuffle between two identical requests.
  ranked.sort(
    (a, b) =>
      a.distance - b.distance ||
      Date.parse(a.calledAt) - Date.parse(b.calledAt) ||
      a.sjyid.localeCompare(b.sjyid),
  );

  return ranked.slice(0, limit);
}

function describe(offsetMinutes: number, actual: boolean): string {
  const source = actual ? 'actual' : 'timetable';

  if (offsetMinutes === 0) return `at the stated time (${source})`;
  if (offsetMinutes < 0) return `${Math.abs(offsetMinutes)} min before the stated time (${source})`;
  return `${offsetMinutes} min after the stated time (${source})`;
}

/**
 * Is this list good enough to show instead of asking for a train number?
 *
 * One clear candidate, or a handful that a person can tell apart. Twenty
 * near-identical suburban services is not a choice, it is a quiz — and at a
 * busy interchange that is exactly what the window returns.
 */
export function isUsableSuggestion(ranked: readonly RankedJourney[]): boolean {
  if (ranked.length === 0) return false;
  if (ranked.length > 6) return false;

  // Distinguishable means the passenger can tell them apart on screen. Two
  // journeys with no train number and the same line are not distinguishable
  // even though they are different rows.
  const labels = new Set(ranked.map((r) => r.trainNumber ?? `${r.line}@${r.calledAt}`));
  return labels.size === ranked.length;
}
