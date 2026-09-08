import { isUsableSuggestion, rankCandidates, type CandidateJourney } from '../trip-suggestion';

const STATED = new Date('2026-09-08T14:30:00Z');

function candidate(over: Partial<CandidateJourney> & { calledAt: string }): CandidateJourney {
  return {
    journeyId: over.calledAt,
    sjyid: `ch:1:sjyid:100058:${over.trainNumber ?? '0000'}-001`,
    operatingDate: '2026-09-08',
    trainNumber: '12920',
    line: 'IC 1',
    originName: 'Zürich HB',
    destinationName: 'Genève-Aéroport',
    ...over,
  };
}

describe('ranking', () => {
  it('puts the closest journey first', () => {
    const ranked = rankCandidates(
      [
        candidate({ calledAt: '2026-09-08T14:05:00Z', trainNumber: 'A' }),
        candidate({ calledAt: '2026-09-08T14:27:00Z', trainNumber: 'B' }),
        candidate({ calledAt: '2026-09-08T14:50:00Z', trainNumber: 'C' }),
      ],
      STATED,
    );

    expect(ranked[0].trainNumber).toBe('B');
  });

  it('prefers a train that departed BEFORE the stated time over one after it', () => {
    // People notice a loss after boarding and report the time they NOTICED.
    // A train 10 minutes earlier is a likelier fit than one 10 minutes later.
    const ranked = rankCandidates(
      [
        candidate({ calledAt: '2026-09-08T14:40:00Z', trainNumber: 'LATER' }),
        candidate({ calledAt: '2026-09-08T14:20:00Z', trainNumber: 'EARLIER' }),
      ],
      STATED,
    );

    expect(ranked[0].trainNumber).toBe('EARLIER');
  });

  it('prefers a call time from actual data over one from the timetable', () => {
    const ranked = rankCandidates(
      [
        candidate({ calledAt: '2026-09-08T14:28:00Z', trainNumber: 'PLANNED' }),
        candidate({ calledAt: '2026-09-08T14:29:00Z', trainNumber: 'REAL', actual: true }),
      ],
      STATED,
    );

    expect(ranked[0].trainNumber).toBe('REAL');
    expect(ranked[0].reason).toMatch(/actual/);
  });

  it('drops anything outside the window', () => {
    const ranked = rankCandidates(
      [
        candidate({ calledAt: '2026-09-08T14:25:00Z', trainNumber: 'IN' }),
        candidate({ calledAt: '2026-09-08T12:00:00Z', trainNumber: 'OUT' }),
      ],
      STATED,
    );

    expect(ranked.map((r) => r.trainNumber)).toEqual(['IN']);
  });

  it('uses a wide default window, because people round the time they say', () => {
    // "About half past" can mean 14:20 or 14:45. A passenger who cannot find
    // their train in the list falls back to free text, which is the failure
    // this whole feature exists to remove.
    const ranked = rankCandidates(
      [candidate({ calledAt: '2026-09-08T13:50:00Z', trainNumber: 'FORTY_MIN_EARLY' })],
      STATED,
    );

    expect(ranked).toHaveLength(1);
  });

  it('reports a signed offset and a human reason for each suggestion', () => {
    const [r] = rankCandidates([candidate({ calledAt: '2026-09-08T14:20:00Z' })], STATED);

    expect(r.offsetMinutes).toBe(-10);
    expect(r.reason).toMatch(/10 min before/);
  });

  it('is stable: the same input twice gives the same order', () => {
    const input = [
      candidate({ calledAt: '2026-09-08T14:20:00Z', trainNumber: 'X' }),
      candidate({ calledAt: '2026-09-08T14:20:00Z', trainNumber: 'Y' }),
    ];

    const first = rankCandidates(input, STATED).map((r) => r.sjyid);
    const second = rankCandidates([...input].reverse(), STATED).map((r) => r.sjyid);

    // A list that reshuffles between two identical requests teaches a
    // passenger not to trust it.
    expect(first).toEqual(second);
  });

  it('ignores a candidate with an unparseable time instead of throwing', () => {
    const ranked = rankCandidates(
      [
        candidate({ calledAt: 'not a time', trainNumber: 'BAD' }),
        candidate({ calledAt: '2026-09-08T14:25:00Z', trainNumber: 'GOOD' }),
      ],
      STATED,
    );

    expect(ranked.map((r) => r.trainNumber)).toEqual(['GOOD']);
  });
});

describe('is the suggestion usable at all', () => {
  it('is not usable when nothing matched', () => {
    expect(isUsableSuggestion([])).toBe(false);
  });

  it('is usable for a handful a person can tell apart', () => {
    const ranked = rankCandidates(
      [
        candidate({ calledAt: '2026-09-08T14:20:00Z', trainNumber: '701' }),
        candidate({ calledAt: '2026-09-08T14:35:00Z', trainNumber: '703' }),
      ],
      STATED,
    );

    expect(isUsableSuggestion(ranked)).toBe(true);
  });

  it('is NOT usable when candidates cannot be told apart on screen', () => {
    // Two suburban services on the same line with no train number are two rows
    // and one choice. Showing them is a quiz, not a suggestion — the honest
    // move is to fall back to asking.
    const ranked = rankCandidates(
      [
        candidate({ calledAt: '2026-09-08T14:25:00Z', trainNumber: null, line: 'S3' }),
        candidate({ calledAt: '2026-09-08T14:25:00Z', trainNumber: null, line: 'S3' }),
      ],
      STATED,
    );

    expect(isUsableSuggestion(ranked)).toBe(false);
  });

  it('is not usable when a busy interchange returns too many', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      candidate({
        calledAt: new Date(STATED.getTime() + i * 60000).toISOString(),
        trainNumber: `S${i}`,
      }),
    );

    expect(isUsableSuggestion(rankCandidates(many, STATED, { limit: 8 }))).toBe(false);
  });
});
