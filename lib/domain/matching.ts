/**
 * Matching: identifier first, then spacetime, then description.
 *
 * The order is the whole design, so it is enforced by the type of the result
 * rather than by the size of a weight. A match has a TIER, and only certain
 * signals can raise the tier:
 *
 *   identifier   an exact agreement on a strong identifier. Nothing else
 *                reaches this tier, ever.
 *   strong       a weaker identifier, or the same journey plus the same
 *                category.
 *   plausible    the same journey, or the same line on the same day plus the
 *                same category.
 *   weak         everything else that agrees on anything at all.
 *
 * Description, colour and brand contribute POINTS, which order results inside
 * a tier, and they carry no tier floor whatsoever. That is the enforceable
 * form of "description must never outrank an identifier or a trip match": it
 * is not a matter of tuning a coefficient, it is unreachable by construction,
 * and `matching.test.ts` asserts it directly.
 *
 * Why be this severe about description? Because short generic descriptions
 * carry almost no signal and semantic similarity actively disguises that:
 *
 *   - agreement weight follows the RARITY of the agreeing value, and "black"
 *     is not rare (Fellegi & Sunter 1969)
 *   - two random words already sit at near-perfect cosine similarity
 *     (Ethayarajh 2019, EMNLP-IJCNLP 55-65), so a high number means nothing
 *     without a calibrated baseline
 *   - frequent, generic vocabulary collapses into a dense blob
 *     (Li et al. 2020, EMNLP 9119-9130)
 *   - in high dimensions a few points become everyone's nearest neighbour
 *     (Radovanović et al. 2010, JMLR 11:2487-2531) — "a generic report matches
 *     everything" is geometry, not bad data
 *
 * There is no embedding in this file and no model output anywhere in the
 * matching path. Every number below is arithmetic a person can re-do by hand,
 * and every one of them is reported in the breakdown, because staff and
 * passengers have to be able to see WHY two records were linked.
 *
 * Pure. No database, no I/O, no clock — pass the time in.
 */

import { agreements, isStrongKind, type Identifier } from './identifiers';

export const MATCH_TIERS = ['none', 'weak', 'plausible', 'strong', 'identifier'] as const;
export type MatchTier = (typeof MATCH_TIERS)[number];

const TIER_RANK: Record<MatchTier, number> = {
  none: 0,
  weak: 1,
  plausible: 2,
  strong: 3,
  identifier: 4,
};

export function tierAtLeast(tier: MatchTier, floor: MatchTier): boolean {
  return TIER_RANK[tier] >= TIER_RANK[floor];
}

/**
 * One side of a comparison. Both a loss report and a found item reduce to
 * this, which is why the function below never needs to know which is which.
 */
export interface MatchSubject {
  /** Already normalised — see identifiers.normaliseIdentifier. */
  identifiers: readonly Identifier[];
  /**
   * The canonical journey: a Swiss Journey ID plus its operating date. Null
   * when the report could not be bound to a real trip.
   */
  journeyKey: string | null;
  /** Train/line number plus operating date — the weaker fallback. */
  lineKey: string | null;
  /** Coach number as printed on the coach, when known. */
  coach: string | null;
  /** The window in which the object went missing, or was found. ISO 8601. */
  from: string | null;
  to: string | null;
  category: string;
  /** Caller-owned tokenisation: this module must not know the language. */
  descriptionTokens: readonly string[];
  colour: string | null;
  brand: string | null;
}

export type SignalName =
  | 'identifier'
  | 'journey'
  | 'line'
  | 'coach'
  | 'time'
  | 'category'
  | 'description'
  | 'colour'
  | 'brand';

export interface SignalContribution {
  signal: SignalName;
  /** Human-readable, shown to staff. Not an identifier value — see redact(). */
  detail: string;
  /** Ordering points WITHIN a tier. Never promotes across tiers. */
  points: number;
  /** The tier this signal alone justifies, if any. */
  tierFloor?: MatchTier;
}

export interface MatchResult {
  tier: MatchTier;
  points: number;
  breakdown: SignalContribution[];
  /**
   * Signals that actively disagree. A conflict never reduces the tier — people
   * mistype train numbers — but it is the thing a human should look at first.
   */
  conflicts: string[];
}

/** Tolerance for "found before it was reported lost", in minutes. */
const FOUND_BEFORE_LOSS_TOLERANCE_MINUTES = 15;

export function computeMatch(a: MatchSubject, b: MatchSubject): MatchResult {
  const breakdown: SignalContribution[] = [];
  const conflicts: string[] = [];

  // ---- 1. Identifiers -----------------------------------------------------
  const shared = agreements(a.identifiers, b.identifiers);
  for (const hit of shared) {
    const strong = isStrongKind(hit.kind);
    breakdown.push({
      signal: 'identifier',
      detail: `${hit.kind} agrees${hit.verified ? ' (both verified)' : ''}`,
      points: strong ? 100 : 40,
      tierFloor: strong ? 'identifier' : 'strong',
    });
  }

  // ---- 2. Spacetime -------------------------------------------------------
  const sameJourney = a.journeyKey !== null && a.journeyKey === b.journeyKey;
  const sameLine = a.lineKey !== null && a.lineKey === b.lineKey;
  const sameCategory = a.category === b.category;

  if (sameJourney) {
    breakdown.push({
      signal: 'journey',
      detail: `same journey ${a.journeyKey}`,
      points: 30,
      // A journey alone is plausible; a journey plus the same kind of object
      // is strong. A train is a small, closed space for a bounded time.
      tierFloor: sameCategory ? 'strong' : 'plausible',
    });
  } else if (sameLine) {
    breakdown.push({
      signal: 'line',
      detail: `same line ${a.lineKey}`,
      points: 12,
      tierFloor: sameCategory ? 'plausible' : 'weak',
    });
  } else if (a.journeyKey && b.journeyKey) {
    conflicts.push(`different journeys (${a.journeyKey} vs ${b.journeyKey})`);
  }

  if (sameJourney && a.coach && b.coach) {
    if (a.coach === b.coach) {
      breakdown.push({
        signal: 'coach',
        detail: `same coach ${a.coach}`,
        points: 15,
        tierFloor: 'strong',
      });
    } else {
      conflicts.push(`different coaches (${a.coach} vs ${b.coach})`);
    }
  }

  const time = compareWindows(a, b);
  if (time) breakdown.push(time.contribution);
  if (time?.conflict) conflicts.push(time.conflict);

  // ---- 3. Description and friends: POINTS ONLY, never a tier floor --------
  if (sameCategory) {
    breakdown.push({ signal: 'category', detail: `both ${a.category}`, points: 5 });
  } else {
    conflicts.push(`different categories (${a.category} vs ${b.category})`);
  }

  const overlap = tokenOverlap(a.descriptionTokens, b.descriptionTokens);
  if (overlap.count > 0) {
    breakdown.push({
      signal: 'description',
      detail: `${overlap.count} shared word${overlap.count === 1 ? '' : 's'}: ${overlap.words.join(', ')}`,
      // Capped hard. Generic words are the common case and must not
      // accumulate into something that looks like evidence.
      points: Math.min(overlap.count, 4),
    });
  }

  if (a.colour && b.colour && a.colour === b.colour) {
    breakdown.push({ signal: 'colour', detail: `both ${a.colour}`, points: 2 });
  }

  if (a.brand && b.brand && a.brand === b.brand) {
    // A brand is more informative than a colour and much less than a serial.
    breakdown.push({ signal: 'brand', detail: `both ${a.brand}`, points: 6 });
  }

  const points = breakdown.reduce((sum, c) => sum + c.points, 0);
  const tier = breakdown.reduce<MatchTier>(
    (best, c) => (c.tierFloor && TIER_RANK[c.tierFloor] > TIER_RANK[best] ? c.tierFloor : best),
    breakdown.length > 0 ? 'weak' : 'none',
  );

  return { tier, points, breakdown, conflicts };
}

interface TimeComparison {
  contribution: SignalContribution;
  conflict?: string;
}

function compareWindows(a: MatchSubject, b: MatchSubject): TimeComparison | null {
  const aFrom = parse(a.from);
  const aTo = parse(a.to);
  const bFrom = parse(b.from);
  const bTo = parse(b.to);
  if (aFrom === null && aTo === null) return null;
  if (bFrom === null && bTo === null) return null;

  const aStart = aFrom ?? aTo!;
  const aEnd = aTo ?? aFrom!;
  const bStart = bFrom ?? bTo!;
  const bEnd = bTo ?? bFrom!;

  const overlaps = aStart <= bEnd && bStart <= aEnd;
  if (overlaps) {
    return {
      contribution: {
        signal: 'time',
        detail: 'time windows overlap',
        points: 10,
        // Time alone is not evidence — thousands of people lose things in any
        // given hour. It only sharpens a journey that already matched.
      },
    };
  }

  const gapMinutes = Math.round(Math.abs(bStart - aEnd) / 60000);
  const tolerated = gapMinutes <= FOUND_BEFORE_LOSS_TOLERANCE_MINUTES;

  return {
    contribution: {
      signal: 'time',
      detail: `windows ${gapMinutes} min apart`,
      points: tolerated ? 2 : 0,
    },
    conflict: tolerated ? undefined : `time windows ${gapMinutes} min apart`,
  };
}

function parse(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

function tokenOverlap(
  a: readonly string[],
  b: readonly string[],
): { count: number; words: string[] } {
  const other = new Set(b);
  const words = [...new Set(a)].filter((t) => other.has(t));
  return { count: words.length, words: words.slice(0, 5) };
}
