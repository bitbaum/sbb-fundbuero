/**
 * A table nobody granted access to is a `permission denied` that only appears
 * in production. CI has no database, so it cannot catch that by running
 * anything — but it CAN catch the thing that causes it: a table added to the
 * schema and forgotten in db/rls.sql.
 *
 * This is a static check and it says so. It does not prove the policies are
 * correct; it proves the two files agree about which tables exist, which is
 * the drift that actually happens.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ALL_TABLES } from '../schema';

const rlsRaw = readFileSync(join(__dirname, '..', 'rls.sql'), 'utf8');
const schemaRaw = readFileSync(join(__dirname, '..', 'schema.ts'), 'utf8');

/**
 * Strip comments before asserting anything.
 *
 * Both of these files EXPLAIN their rules in prose, so a scanner that reads
 * the prose finds the very strings the rules forbid: rls.sql says "there is no
 * `GRANT ... ON ALL TABLES`" and schema.ts says the schema carries no reward
 * column because VPB Art. 77 Abs. 2 bars a finder's reward. Both sentences made
 * this file fail on its first run — a gate tripped by the comment that
 * documents it is checking the documentation, not the code.
 *
 * Quote-aware, because a blind scan desynchronises the moment a string
 * contains the comment marker (or an apostrophe).
 */
function stripComments(source: string, lineMarker: '--' | '//'): string {
  let out = '';
  let quote: string | null = null;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const rest = source.slice(i, i + 2);

    if (quote) {
      out += ch;
      if (ch === quote && source[i - 1] !== '\\') quote = null;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      out += ch;
      continue;
    }

    if (rest === lineMarker) {
      while (i < source.length && source[i] !== '\n') i++;
      out += '\n';
      continue;
    }

    if (lineMarker === '//' && rest === '/*') {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? source.length : end + 1;
      out += '\n';
      continue;
    }

    out += ch;
  }

  return out;
}

const rls = stripComments(rlsRaw, '--');
const schemaSource = stripComments(schemaRaw, '//');

/** Table names as pgTable() actually declares them, read from the source. */
function declaredTables(): string[] {
  return [...schemaRaw.matchAll(/pgTable\(\s*'([^']+)'/g)].map((m) => m[1]);
}

/** The ARRAY[...] block inside the DO $$ that enables RLS. */
function rlsLoopTables(): string[] {
  const block = rlsRaw.match(/tables text\[\] := ARRAY\[([\s\S]*?)\]/);
  if (!block) throw new Error('could not find the RLS table array in db/rls.sql');
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

describe('ALL_TABLES is the real list', () => {
  it('names exactly the tables the schema declares', () => {
    // Guards the guard: if ALL_TABLES drifts from the actual pgTable calls,
    // every other assertion here is checking a fiction.
    expect([...ALL_TABLES].sort()).toEqual(declaredTables().sort());
  });
});

describe('db/rls.sql covers every table', () => {
  it('enables and forces row-level security on all of them', () => {
    expect(rlsLoopTables().sort()).toEqual([...ALL_TABLES].sort());
  });

  it('forces RLS, not merely enables it', () => {
    // A table owner bypasses RLS unless FORCE is set. Without this line the
    // policies are decorative for anyone connecting as the owner.
    expect(rls).toMatch(/FORCE ROW LEVEL SECURITY/);
  });

  it('grants something explicit to every table', () => {
    // Enabling RLS without a grant locks the app out; a grant without RLS
    // leaves it open. Both halves have to name each table.
    for (const table of ALL_TABLES) {
      expect(rls).toMatch(new RegExp(`GRANT [A-Z, ]+ ON public\\.${table}\\b`));
    }
  });
});

describe('the default is closed', () => {
  it('revokes everything from PUBLIC', () => {
    expect(rls).toMatch(/REVOKE ALL ON SCHEMA public FROM PUBLIC/);
    expect(rls).toMatch(/REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC/);
  });

  it('never grants on ALL TABLES', () => {
    // `GRANT ... ON ALL TABLES` would silently cover whatever is added next,
    // which is exactly the decision this file exists to make explicit.
    expect(rls).not.toMatch(/GRANT[^;]*ON ALL TABLES/);
  });

  it('does not let the application rewrite history', () => {
    // Resolutions and audit events are append-only. Correcting a resolution
    // means recording a new decision, not editing the old one.
    for (const table of ['claim_resolutions', 'audit_events']) {
      const grant = rls.match(new RegExp(`GRANT ([A-Z, ]+) ON public\\.${table}\\b`));
      expect(grant).not.toBeNull();
      expect(grant![1]).not.toMatch(/UPDATE|DELETE/);
    }
  });

  it('gives the app read-only access to imported reference data', () => {
    for (const table of ['stops', 'journeys', 'journey_calls', 'formations', 'formation_coaches']) {
      const grant = rls.match(new RegExp(`GRANT ([A-Z, ]+) ON public\\.${table}\\b`));
      expect(grant).not.toBeNull();
      expect(grant![1].trim()).toBe('SELECT');
    }
  });

  it('does not put a password in the repository', () => {
    expect(rls).toMatch(/CREATE ROLE fundbuero_app NOLOGIN/);
    expect(rls).not.toMatch(/PASSWORD\s+'/i);
  });
});

describe('the reward field is gone and stays gone', () => {
  it('has no reward or payment column anywhere in the schema', () => {
    // VPB Art. 77 Abs. 2 (SR 745.11): a transport operator may not claim a
    // finder's reward at all. A column would be an invitation to add one.
    expect(schemaSource).not.toMatch(/reward/i);
    expect(schemaSource).not.toMatch(/\bpayment\b/i);
  });
});
