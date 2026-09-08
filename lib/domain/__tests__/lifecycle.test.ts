import {
  CLAIM_STATES,
  CLAIM_TRANSITIONS,
  REPORT_STATES,
  REPORT_TRANSITIONS,
  canRelease,
  isTerminalClaimState,
  isTerminalReportState,
  transitionClaim,
  transitionReport,
  type ClaimState,
  type ReportState,
} from '../lifecycle';

describe('report lifecycle', () => {
  it('allows a report filed after the trip to still be matched', () => {
    // The product's premise is that speed helps, not that slowness forecloses.
    // The incumbent operator's own system re-matches open reports against
    // later finds, so a model that cannot do the same would be worse than
    // what already exists.
    expect(transitionReport('submitted', 'matched').ok).toBe(true);
  });

  it('allows a match after the crew searched and found nothing', () => {
    // "Not found on board" is not the end — a passenger may hand it in at the
    // terminus an hour later. Treating it as terminal is what makes a
    // lost-property system feel like a dead end.
    expect(transitionReport('not_found_onboard', 'matched').ok).toBe(true);
  });

  it('refuses to move out of a terminal state', () => {
    const result = transitionReport('closed', 'searching');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/terminal/);
      expect(result.allowed).toHaveLength(0);
    }
  });

  it('refuses a transition that is simply not in the table', () => {
    const result = transitionReport('submitted', 'returned');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/submitted -> returned/);
      // The error names the legal moves, so a caller can act on it.
      expect(result.allowed).toContain('notified');
    }
  });

  it('has exactly three terminal states, and returned is not one of them', () => {
    // `returned` still has to be closed off explicitly, so that "the passenger
    // has it back" and "there is nothing left to do" stay separate facts.
    const terminal = REPORT_STATES.filter(isTerminalReportState);
    expect([...terminal].sort()).toEqual(
      (['closed', 'expired', 'withdrawn'] as ReportState[]).sort(),
    );
    expect(isTerminalReportState('returned')).toBe(false);
  });

  it('names every state in the table, and every target is a real state', () => {
    // Guards against a state added to the union but forgotten in the table —
    // which would make `table[from]` undefined and silently forbid everything.
    for (const state of REPORT_STATES) {
      expect(REPORT_TRANSITIONS[state]).toBeDefined();
      for (const target of REPORT_TRANSITIONS[state]) {
        expect(REPORT_STATES).toContain(target);
      }
    }
  });

  it('can reach every non-initial state from submitted', () => {
    // A state nothing can reach is dead code wearing a domain name.
    const reachable = new Set<ReportState>(['submitted']);
    let grew = true;
    while (grew) {
      grew = false;
      for (const state of [...reachable]) {
        for (const next of REPORT_TRANSITIONS[state]) {
          if (!reachable.has(next)) {
            reachable.add(next);
            grew = true;
          }
        }
      }
    }
    expect([...REPORT_STATES].filter((s) => !reachable.has(s))).toEqual([]);
  });
});

describe('claim lifecycle', () => {
  it('has NO path from opened straight to upheld', () => {
    // This is the whole security model. Found-item details are private so that
    // seeing an item is not evidence of owning it; a claim that could be
    // upheld without a challenge would make the privacy pointless.
    expect(transitionClaim('opened', 'upheld').ok).toBe(false);
  });

  it('requires the challenge to be answered before it can be upheld', () => {
    expect(transitionClaim('challenged', 'upheld').ok).toBe(false);
    expect(transitionClaim('answered', 'upheld').ok).toBe(true);
  });

  it('lets a challenge be reissued rather than costing someone their property', () => {
    expect(transitionClaim('challenged', 'challenged').ok).toBe(true);
    expect(transitionClaim('answered', 'challenged').ok).toBe(true);
  });

  it('cannot reopen a resolved claim', () => {
    expect(transitionClaim('upheld', 'challenged').ok).toBe(false);
    expect(transitionClaim('rejected', 'challenged').ok).toBe(false);
  });

  it('names every state in the table, and every target is a real state', () => {
    for (const state of CLAIM_STATES) {
      expect(CLAIM_TRANSITIONS[state]).toBeDefined();
      for (const target of CLAIM_TRANSITIONS[state]) {
        expect(CLAIM_STATES).toContain(target);
      }
    }
  });

  it('marks the four resolved states terminal', () => {
    const terminal = CLAIM_STATES.filter(isTerminalClaimState);
    expect([...terminal].sort()).toEqual(
      (['expired', 'rejected', 'upheld', 'withdrawn'] as ClaimState[]).sort(),
    );
  });
});

describe('release preconditions', () => {
  const upheld = {
    state: 'upheld' as ClaimState,
    challengeAnswered: true,
    confidence: 'certain' as const,
  };

  it('permits release when the claim was upheld on an answered challenge', () => {
    const check = canRelease(upheld);
    expect(check.permitted).toBe(true);
    expect(check.reasons).toEqual([]);
  });

  it('always demands a named human, even when permitted', () => {
    // Art. 21 revDSG: a person may not be subject to a decision with legal
    // effect taken solely by automated processing. Handing over property is
    // exactly such a decision, so this flag is not configurable.
    expect(canRelease(upheld).requiresNamedResolver).toBe(true);
  });

  it('refuses when no challenge was answered', () => {
    const check = canRelease({ ...upheld, challengeAnswered: false });
    expect(check.permitted).toBe(false);
    expect(check.reasons.join(' ')).toMatch(/challenge/);
  });

  it('refuses when the resolver recorded the evidence as insufficient', () => {
    const check = canRelease({ ...upheld, confidence: 'insufficient' });
    expect(check.permitted).toBe(false);
    expect(check.reasons.join(' ')).toMatch(/insufficient/);
  });

  it('refuses when no confidence was recorded at all', () => {
    const check = canRelease({ ...upheld, confidence: null });
    expect(check.permitted).toBe(false);
  });

  it('refuses a claim that is not upheld, whatever else is true', () => {
    for (const state of CLAIM_STATES.filter((s) => s !== 'upheld')) {
      expect(canRelease({ ...upheld, state }).permitted).toBe(false);
    }
  });
});
