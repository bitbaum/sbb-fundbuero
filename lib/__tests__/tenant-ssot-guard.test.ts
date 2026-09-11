/**
 * The tenant SSOT guard, tested by running it.
 *
 * `check-tenant-ssot.sh` grew an exemption: the `title:` line of a Source in
 * `lib/research.ts` may name an operator, because a published article's title
 * is a quotation and paraphrasing it would break the citation AGENTS.md rule 1
 * requires. Every exemption to a guard is a hole, and a hole nobody measures
 * is the usual way a guard stops guarding.
 *
 * So this runs the real script — against a FIXTURE TREE in a temp directory,
 * never against this repository. Two reasons, both of which this test hit on
 * the way in:
 *
 *   - a check that scans a directory will scan its own test data. The first
 *     version of this file spelled the operator name out inline, and `pnpm run
 *     verify` failed on the test rather than on the code. The fixture bodies
 *     therefore live under `test-fixtures/`, which the guard does not scan.
 *     The alternative — exempting `__tests__` from the guard — would have put
 *     a real hole in it to accommodate a test.
 *   - mutating the repository's own files to watch them fail leaves damage
 *     behind if the run is interrupted.
 *
 * The script `cd`s to its own parent, so handing it a fixture root is enough
 * to point it somewhere harmless.
 *
 * Three cases, because the exemption has two edges and both can fail open:
 * the quotation must pass, a claim in the same file must still fail, and the
 * same quotation in a different file must still fail.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = path.join(__dirname, '..', '..');
const GUARD = path.join(REPO, 'scripts', 'check-tenant-ssot.sh');
const FIXTURES = path.join(REPO, 'test-fixtures', 'tenant-ssot');

/** Fixture bodies live outside the scanned tree — see the header. */
const body = (name: string) => fs.readFileSync(path.join(FIXTURES, `${name}.ts.txt`), 'utf8');

/** A minimal tree the guard considers valid, plus whatever the case adds. */
function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tenant-ssot-'));
  const write = (rel: string, content: string) => {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  };

  write('scripts/check-tenant-ssot.sh', fs.readFileSync(GUARD, 'utf8'));

  // The guard's second assertion: the neutral house brand is still default.
  write('lib/tenant.ts', "const DEFAULT_TENANT_ID: TenantId = 'nordbahn';\n");
  write('app/globals.css', ':root {\n  --brand: #0b4f8f;\n}\n');
  write('components/.keep', '');

  for (const [rel, content] of Object.entries(files)) write(rel, content);
  return root;
}

/** Exit code of the guard run inside `root`. */
function run(root: string): number {
  try {
    execFileSync('bash', [path.join(root, 'scripts', 'check-tenant-ssot.sh')], { stdio: 'pipe' });
    return 0;
  } catch (e) {
    return (e as { status: number }).status;
  }
}

describe('the tenant SSOT guard', () => {
  const made: string[] = [];
  const tree = (files: Record<string, string>) => {
    const root = fixture(files);
    made.push(root);
    return root;
  };

  afterAll(() => {
    for (const root of made) fs.rmSync(root, { recursive: true, force: true });
  });

  it('reads its fixtures (guards against an empty fixture passing everything)', () => {
    // A fixture file renamed or emptied would turn the two failure cases below
    // into clean trees, and they would pass by checking nothing.
    expect(body('citation-title')).toMatch(/title: '/);
    expect(body('branded-claim')).toMatch(/claim: '/);
  });

  it('passes a clean tree (guards against the guard failing for the wrong reason)', () => {
    expect(run(tree({ 'lib/research.ts': body('clean') }))).toBe(0);
  });

  it('allows an operator name inside a citation title in research.ts', () => {
    expect(run(tree({ 'lib/research.ts': body('citation-title') }))).toBe(0);
  });

  it('still fails an operator name on any other line of research.ts', () => {
    // This is the edge that matters. If the exemption were written as
    // "research.ts is allowed", branding prose could move into the evidence
    // module and the guard would wave it through.
    expect(run(tree({ 'lib/research.ts': body('branded-claim') }))).toBe(1);
  });

  it('still fails the same citation title in a different file', () => {
    // The exemption is anchored to one path. A `title:` line is not a blanket
    // licence to name an operator anywhere in the codebase.
    expect(run(tree({ 'lib/elsewhere.ts': body('citation-title') }))).toBe(1);
  });

  it('still fails when the neutral brand stops being the default', () => {
    const root = tree({ 'lib/research.ts': body('clean') });
    fs.writeFileSync(
      path.join(root, 'lib', 'tenant.ts'),
      "const DEFAULT_TENANT_ID: TenantId = 'sbb';\n",
    );
    expect(run(root)).toBe(1);
  });
});
