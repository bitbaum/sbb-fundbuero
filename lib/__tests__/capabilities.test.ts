/**
 * AGENTS.md rule 2 — "never mock an integration so that it looks live" — held
 * against the filesystem.
 *
 * The website says the crew feed is built and passenger notification is not.
 * Both halves of that sentence can rot: the first if the bus is deleted, the
 * second (the likelier one) if someone implements passenger notification and
 * leaves the page saying it is merely designed — or, far worse, writes the
 * page in the present tense before the code exists.
 *
 * These tests fail in either direction. That is the property worth having: the
 * claim and the code cannot disagree for longer than one CI run.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { NOTIFY_CAPABILITIES, type Capability } from '../capabilities';
import { CATALOGUES, LOCALES } from '../i18n';

const REPO_ROOT = join(__dirname, '..', '..');
const byStatus = (s: Capability['status']) => NOTIFY_CAPABILITIES.filter((c) => c.status === s);

describe('the capability claims', () => {
  it('gives every capability a unique id', () => {
    const ids = NOTIFY_CAPABILITIES.map((c) => c.id);
    expect(ids).toEqual([...new Set(ids)]);
  });

  it.each(byStatus('built').map((c) => [c.id, c] as const))(
    'has the file that makes "%s" true',
    (_id, c) => {
      expect(c.proof).toBeDefined();
      expect(existsSync(join(REPO_ROOT, c.proof!))).toBe(true);
    },
  );

  it.each(byStatus('designed').map((c) => [c.id, c] as const))(
    'has NOT quietly built "%s" while the page still calls it designed',
    (_id, c) => {
      expect(c.proof).toBeDefined();
      // If this fails, the feature shipped. Change the status to 'built' —
      // do not delete the assertion.
      expect(existsSync(join(REPO_ROOT, c.proof!))).toBe(false);
    },
  );

  it('claims nothing as built without a file to point at', () => {
    // The load-bearing one. A capability with status 'built' and no `proof`
    // would pass every other test here by having nothing to check.
    for (const c of byStatus('built')) {
      expect(typeof c.proof).toBe('string');
      expect(c.proof!.length).toBeGreaterThan(0);
    }
  });

  it('attaches no proof file to a refusal', () => {
    // A refusal is evidenced by a rule, not a file. Giving it a path invites
    // someone to satisfy the rule by creating one.
    for (const c of byStatus('refused')) expect(c.proof).toBeUndefined();
  });

  it('renders every capability in all four languages', () => {
    // A capability whose note exists only in German silently renders German
    // to a French reader via the fallback, which reads as a translation bug
    // rather than the missing sentence it is.
    for (const c of NOTIFY_CAPABILITIES) {
      for (const locale of LOCALES) {
        expect(CATALOGUES[locale][c.titleKey]).toBeTruthy();
        expect(CATALOGUES[locale][c.noteKey]).toBeTruthy();
      }
    }
  });

  it('keeps the two refusals on the list', () => {
    // Public listings (rule 5) and finder's rewards (rule 6) are decisions
    // with reasons. Dropping them from the page turns a stated refusal into
    // an omission, which is how a "roadmap item" gets born.
    const refused = byStatus('refused').map((c) => c.id);
    expect(refused).toContain('public-listing');
    expect(refused).toContain('reward');
  });
});
