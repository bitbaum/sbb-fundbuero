/**
 * Explicit lifecycles for a loss report and for an ownership claim.
 *
 * Both are transition TABLES, not status strings updated wherever it seemed
 * convenient. A status field that any code path may set to any value is not a
 * state machine, it is a mutable string that happens to be spelled like one:
 * nothing stops a report going from `closed` back to `searching`, and nothing
 * records who moved it. The tables below make illegal transitions
 * unrepresentable at the one place that performs them.
 *
 * Pure. No database, no clock — pass the time in.
 */

// ---------------------------------------------------------------------------
// Loss report
// ---------------------------------------------------------------------------

export const REPORT_STATES = [
  /** Filed. Nothing has happened yet. */
  'submitted',
  /** Crew have been told, because the vehicle is still running. */
  'notified',
  /** Crew acknowledged and are looking now. */
  'searching',
  /** Crew found it on board — the outcome the product exists for. */
  'found_onboard',
  /** Crew looked and it was not there. NOT the end: it may still be handed in. */
  'not_found_onboard',
  /** Linked to a found item. */
  'matched',
  /** Back with its owner. */
  'returned',
  /** Nothing further will happen. */
  'closed',
  /** The reporter cancelled it. */
  'withdrawn',
  /** Retention deadline reached; the record is due for deletion. */
  'expired',
] as const;

export type ReportState = (typeof REPORT_STATES)[number];

/**
 * Note what is deliberately reachable:
 *
 *   submitted -> matched          a report filed after the trip can still be
 *                                 matched from the depot. The product's
 *                                 premise is that speed helps, not that
 *                                 slowness forecloses.
 *   not_found_onboard -> matched  the crew looked and missed it, or a
 *                                 passenger handed it in at the terminus.
 *                                 Treating "not found" as terminal is what
 *                                 makes a lost-property system feel like a
 *                                 dead end to the person using it.
 *
 * And what is not: nothing returns from `returned`, `closed`, `withdrawn` or
 * `expired`. Those are the only four terminal states.
 */
export const REPORT_TRANSITIONS: Record<ReportState, readonly ReportState[]> = {
  submitted: ['notified', 'matched', 'withdrawn', 'expired', 'closed'],
  notified: ['searching', 'not_found_onboard', 'matched', 'withdrawn', 'expired'],
  searching: ['found_onboard', 'not_found_onboard', 'withdrawn', 'expired'],
  found_onboard: ['matched', 'returned', 'closed', 'expired'],
  not_found_onboard: ['matched', 'closed', 'expired'],
  matched: ['returned', 'not_found_onboard', 'closed', 'expired'],
  returned: ['closed'],
  closed: [],
  withdrawn: [],
  expired: [],
};

export const TERMINAL_REPORT_STATES: readonly ReportState[] = ['closed', 'withdrawn', 'expired'];

// ---------------------------------------------------------------------------
// Ownership claim
// ---------------------------------------------------------------------------

/**
 * A claim is an assertion with evidence, resolved by a CHALLENGE: the claimant
 * describes something the listing does not show — a lock screen, a scratch,
 * what is in the side pocket.
 *
 * There is no path from `opened` to `upheld`. Every claim must pass through a
 * challenge, because the alternative is that anyone who can see a found item
 * can claim it, and found-item details are private precisely so that seeing
 * one is not evidence of owning it.
 */
export const CLAIM_STATES = [
  'opened',
  'challenged',
  'answered',
  'upheld',
  'rejected',
  'withdrawn',
  'expired',
] as const;

export type ClaimState = (typeof CLAIM_STATES)[number];

export const CLAIM_TRANSITIONS: Record<ClaimState, readonly ClaimState[]> = {
  opened: ['challenged', 'withdrawn', 'expired'],
  // A challenge can be reissued — one unanswerable question should not
  // permanently cost someone their property.
  challenged: ['answered', 'challenged', 'rejected', 'withdrawn', 'expired'],
  answered: ['upheld', 'rejected', 'challenged', 'withdrawn', 'expired'],
  upheld: [],
  rejected: [],
  withdrawn: [],
  expired: [],
};

/**
 * How sure the resolver was. Recorded per resolution and never inferred: a
 * claim upheld on a balance of probabilities is a different act from one
 * upheld on a matching IMEI, and six months later only the record can say
 * which happened.
 */
export const RESOLUTION_CONFIDENCE = ['certain', 'probable', 'insufficient'] as const;
export type ResolutionConfidence = (typeof RESOLUTION_CONFIDENCE)[number];

// ---------------------------------------------------------------------------
// The one place a transition happens
// ---------------------------------------------------------------------------

export interface TransitionOk<S> {
  ok: true;
  state: S;
}

export interface TransitionError<S> {
  ok: false;
  /** Safe to show a user: it names states, never data. */
  reason: string;
  from: S;
  to: S;
  allowed: readonly S[];
}

export type TransitionResult<S> = TransitionOk<S> | TransitionError<S>;

function transition<S extends string>(
  table: Record<S, readonly S[]>,
  label: string,
  from: S,
  to: S,
): TransitionResult<S> {
  const allowed = table[from] ?? [];

  if (!allowed.includes(to)) {
    return {
      ok: false,
      reason:
        allowed.length === 0
          ? `${label} is ${from}, which is terminal — no transition is possible`
          : `${label} cannot go ${from} -> ${to}; allowed: ${allowed.join(', ')}`,
      from,
      to,
      allowed,
    };
  }

  return { ok: true, state: to };
}

export function transitionReport(
  from: ReportState,
  to: ReportState,
): TransitionResult<ReportState> {
  return transition(REPORT_TRANSITIONS, 'report', from, to);
}

export function transitionClaim(from: ClaimState, to: ClaimState): TransitionResult<ClaimState> {
  return transition(CLAIM_TRANSITIONS, 'claim', from, to);
}

export function isTerminalReportState(state: ReportState): boolean {
  return REPORT_TRANSITIONS[state].length === 0;
}

export function isTerminalClaimState(state: ClaimState): boolean {
  return CLAIM_TRANSITIONS[state].length === 0;
}

/**
 * May this found item be handed over?
 *
 * Deliberately not a boolean on its own. Releasing someone's property is a
 * decision with legal effect, and Art. 21 revDSG gives a person the right not
 * to be subject to one taken solely by automated processing — so this function
 * reports whether the PRECONDITIONS hold and always requires a named human to
 * act. It never releases anything itself.
 */
export interface ReleaseCheck {
  permitted: boolean;
  reasons: string[];
  /** Always true. Present so a caller cannot forget it exists. */
  requiresNamedResolver: true;
}

export function canRelease(claim: {
  state: ClaimState;
  challengeAnswered: boolean;
  confidence: ResolutionConfidence | null;
}): ReleaseCheck {
  const reasons: string[] = [];

  if (claim.state !== 'upheld') {
    reasons.push(`claim is ${claim.state}, not upheld`);
  }
  if (!claim.challengeAnswered) {
    reasons.push('no challenge was answered');
  }
  if (claim.confidence === null) {
    reasons.push('resolution recorded no confidence level');
  } else if (claim.confidence === 'insufficient') {
    reasons.push('resolver recorded the evidence as insufficient');
  }

  return {
    permitted: reasons.length === 0,
    reasons,
    requiresNamedResolver: true,
  };
}
