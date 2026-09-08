import {
  DELETION_POLICY,
  DISPOSAL_RULE,
  foundItemRetention,
  isDue,
  reportRetention,
  tightenedDeadline,
} from '../retention';

const FOUND_AT = new Date('2026-09-08T12:00:00Z');

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

describe('disposal is statute and deletion is policy — they are separate dates', () => {
  it('never returns the same date for both', () => {
    // Conflating them would quietly assert that Swiss law tells us when to
    // delete somebody's phone number. VPB Art. 77 says when the OBJECT may be
    // auctioned; it says nothing about the record.
    const r = foundItemRetention(FOUND_AT, null);
    expect(r.deleteAfter.getTime()).toBeGreaterThan(r.disposalEligibleAt.getTime());
  });

  it('labels the disposal rule with its statutory source', () => {
    expect(DISPOSAL_RULE.source).toMatch(/VPB Art\. 77/);
  });

  it('labels the deletion policy as an assumption, not law', () => {
    expect(DELETION_POLICY.basis).toMatch(/assumption/);
  });
});

describe('disposal eligibility follows VPB Art. 77 Abs. 4', () => {
  it('is three months for an ordinary item', () => {
    const r = foundItemRetention(FOUND_AT, 200);
    expect(daysBetween(FOUND_AT, r.disposalEligibleAt)).toBe(90);
  });

  it('is one month for an item worth at most CHF 50', () => {
    const r = foundItemRetention(FOUND_AT, 50);
    expect(daysBetween(FOUND_AT, r.disposalEligibleAt)).toBe(30);
  });

  it('treats CHF 50 exactly as low value — the statute says "höchstens"', () => {
    expect(daysBetween(FOUND_AT, foundItemRetention(FOUND_AT, 50).disposalEligibleAt)).toBe(30);
    expect(daysBetween(FOUND_AT, foundItemRetention(FOUND_AT, 50.01).disposalEligibleAt)).toBe(90);
  });

  it('takes the LONGER period when nobody has estimated a value', () => {
    // Guessing an item is worthless and selling it a month later is the
    // expensive direction to be wrong in.
    expect(daysBetween(FOUND_AT, foundItemRetention(FOUND_AT, null).disposalEligibleAt)).toBe(90);
  });

  it('carries the rule that produced the date, so it travels with the record', () => {
    expect(foundItemRetention(FOUND_AT, 20).rationale).toMatch(/CHF 50/);
    expect(foundItemRetention(FOUND_AT, 20).rationale).toMatch(/VPB Art\. 77/);
  });
});

describe('report retention', () => {
  const SUBMITTED = new Date('2026-09-08T12:00:00Z');

  it('keeps an open report for a year', () => {
    const r = reportRetention(SUBMITTED, null);
    expect(daysBetween(SUBMITTED, r.deleteAfter)).toBe(DELETION_POLICY.openReportDays);
  });

  it('shortens sharply once the case closes', () => {
    const closed = new Date('2026-09-20T12:00:00Z');
    const r = reportRetention(SUBMITTED, closed);
    expect(daysBetween(closed, r.deleteAfter)).toBe(DELETION_POLICY.afterClosureDays);
  });
});

describe('a deadline can only ever move earlier', () => {
  it('takes the earlier of the two dates', () => {
    const early = new Date('2026-10-01T00:00:00Z');
    const late = new Date('2026-12-01T00:00:00Z');
    expect(tightenedDeadline(late, early)).toBe(early);
  });

  it('refuses to extend an existing deadline', () => {
    // Otherwise closing and reopening a case in a loop keeps personal data
    // alive indefinitely, which is exactly the failure a retention column is
    // supposed to make impossible.
    const early = new Date('2026-10-01T00:00:00Z');
    const late = new Date('2026-12-01T00:00:00Z');
    expect(tightenedDeadline(early, late)).toBe(early);
  });
});

describe('isDue', () => {
  it('is true once the deadline has passed', () => {
    expect(isDue(new Date('2026-09-01T00:00:00Z'), new Date('2026-09-08T00:00:00Z'))).toBe(true);
  });

  it('is true exactly ON the deadline, not a day later', () => {
    const t = new Date('2026-09-08T00:00:00Z');
    expect(isDue(t, t)).toBe(true);
  });

  it('is false before it', () => {
    expect(isDue(new Date('2026-10-01T00:00:00Z'), new Date('2026-09-08T00:00:00Z'))).toBe(false);
  });
});
