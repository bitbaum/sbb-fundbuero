/**
 * Retention.
 *
 * Two deadlines that are easy to conflate and must not be:
 *
 *   disposalEligibleAt   when the OBJECT may be sold. This is statute, and it
 *                        is sourced: VPB Art. 77 Abs. 4 (SR 745.11) lets a
 *                        transport operator auction a found item after three
 *                        months — one month if its current value is at most
 *                        CHF 50.
 *
 *   deleteAfter          when the RECORD, including someone's contact details
 *                        and photographs of their possessions, is purged. This
 *                        is NOT in the VPB. It is a data-protection question
 *                        (revDSG), and revDSG sets no fixed number: it requires
 *                        that personal data be kept only as long as the purpose
 *                        requires. So the numbers below are OUR POLICY and are
 *                        labelled as assumptions, not law.
 *
 * Writing them as one field would quietly assert that Swiss law tells us when
 * to delete a phone number. It does not.
 *
 * The deadline is a column with a purge job behind it, never a paragraph in a
 * policy document. Retention that depends on someone remembering is retention
 * that does not happen.
 *
 * Pure. Takes the clock as an argument.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Sourced. VPB Art. 77 Abs. 4, SR 745.11. */
export const DISPOSAL_RULE = {
  standardDays: 90,
  lowValueDays: 30,
  lowValueThresholdChf: 50,
  source: 'VPB Art. 77 Abs. 4 (SR 745.11)',
} as const;

/**
 * ASSUMPTION, not law. revDSG requires purpose-limited retention and names no
 * period; these are our choices and should be reviewed by someone qualified
 * before this handles a real person's data.
 */
export const DELETION_POLICY = {
  /** An open loss report stays useful while the item might still surface. */
  openReportDays: 365,
  /** After the case closes, contact details have no remaining purpose. */
  afterClosureDays: 30,
  /**
   * A found item's record outlives the object itself, so a later claimant can
   * be told what happened to it — but not indefinitely.
   */
  afterDisposalDays: 365,
  basis: 'assumption — revDSG sets no fixed period',
} as const;

export interface FoundItemRetention {
  disposalEligibleAt: Date;
  deleteAfter: Date;
  /** Shown in the UI and in the audit log, so the rule travels with the date. */
  rationale: string;
}

/**
 * @param estimatedValueChf null when nobody has estimated it. Null takes the
 *        LONGER period: guessing an item is worthless, and disposing of it a
 *        month later, is the expensive direction to be wrong in.
 */
export function foundItemRetention(
  foundAt: Date,
  estimatedValueChf: number | null,
): FoundItemRetention {
  const lowValue =
    estimatedValueChf !== null && estimatedValueChf <= DISPOSAL_RULE.lowValueThresholdChf;

  const disposalDays = lowValue ? DISPOSAL_RULE.lowValueDays : DISPOSAL_RULE.standardDays;
  const disposalEligibleAt = addDays(foundAt, disposalDays);

  return {
    disposalEligibleAt,
    deleteAfter: addDays(disposalEligibleAt, DELETION_POLICY.afterDisposalDays),
    rationale: lowValue
      ? `value ≤ CHF ${DISPOSAL_RULE.lowValueThresholdChf}: ${DISPOSAL_RULE.lowValueDays} days per ${DISPOSAL_RULE.source}`
      : `${DISPOSAL_RULE.standardDays} days per ${DISPOSAL_RULE.source}`,
  };
}

export interface ReportRetention {
  deleteAfter: Date;
  rationale: string;
}

export function reportRetention(submittedAt: Date, closedAt: Date | null): ReportRetention {
  if (closedAt) {
    return {
      deleteAfter: addDays(closedAt, DELETION_POLICY.afterClosureDays),
      rationale: `${DELETION_POLICY.afterClosureDays} days after closure (${DELETION_POLICY.basis})`,
    };
  }

  return {
    deleteAfter: addDays(submittedAt, DELETION_POLICY.openReportDays),
    rationale: `${DELETION_POLICY.openReportDays} days while open (${DELETION_POLICY.basis})`,
  };
}

/**
 * Closing a case must never EXTEND a deadline that was already running. A
 * report closed on day 364 has 30 days left; one closed on day 1 does too — but
 * a rule that only ever moved the date forward would let closing and reopening
 * a case keep personal data alive indefinitely.
 */
export function tightenedDeadline(current: Date, proposed: Date): Date {
  return proposed < current ? proposed : current;
}

/** Everything whose deadline has passed, given a clock. */
export function isDue(deleteAfter: Date, now: Date): boolean {
  return deleteAfter.getTime() <= now.getTime();
}

function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * DAY_MS);
}
