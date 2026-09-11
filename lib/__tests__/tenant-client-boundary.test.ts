/**
 * No client component may resolve the tenant.
 *
 * WHAT HAPPENED
 *
 * `SiteHeader` imported `lib/tenant.ts` and rendered `tenant.wordmark`. On a
 * build made without `NEXT_PUBLIC_TENANT` and then RUN with it set, the page
 * title named one operator and the logo named a different one — on the same
 * screen, at the same time.
 *
 * `NEXT_PUBLIC_*` has two origins. Next inlines it into the client bundle at
 * BUILD time; a server component reads `process.env` at REQUEST time. They
 * agree only when the build and the runtime were handed the same value, which
 * a deploy that configures the systemd unit rather than the build step does
 * not guarantee. The failure is silent — no error, no warning, just two
 * different operators rendered by one page — and it gets worse with the tenant
 * SSOT specifically, because failing open to someone else's brand is the one
 * failure mode that carries real cost (AGENTS.md, "Trademark safety").
 *
 * THE RULE
 *
 * The tenant is resolved on the server and passed down as props. A component
 * that is handed a value cannot disagree with the server about it, whatever
 * the bundler inlined.
 *
 * This scans for the import rather than for the symptom, because the symptom
 * only appears in a build/runtime combination that no local `pnpm run dev`
 * reproduces.
 */
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.join(__dirname, '..', '..');
const ROOTS = ['app', 'components', 'lib'];

/** Every `.ts`/`.tsx` file under the scanned roots. */
function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') walk(full);
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push(full);
      }
    }
  };
  ROOTS.map((d) => path.join(REPO, d))
    .filter(fs.existsSync)
    .forEach(walk);
  return out;
}

/** `'use client'` / `"use client"` as the module's first statement. */
const isClientModule = (src: string) => /^\s*(?:\/\*[\s\S]*?\*\/\s*)?['"]use client['"]/.test(src);

const IMPORTS_TENANT = /from\s+['"](?:@\/lib\/tenant|\.{1,2}(?:\/[^'"]*)?\/tenant)['"]/;

describe('the tenant stays on the server', () => {
  const files = sourceFiles().map((file) => ({ file, src: fs.readFileSync(file, 'utf8') }));

  it('finds client modules to check (guards against the scan silently breaking)', () => {
    // Without this the suite passes trivially the day the walk stops finding
    // files — a green check that inspected nothing.
    expect(files.filter((f) => isClientModule(f.src)).length).toBeGreaterThan(0);
  });

  it('finds the tenant module itself (guards against the import pattern rotting)', () => {
    // If `lib/tenant.ts` is renamed, IMPORTS_TENANT matches nothing and this
    // guard would go quiet rather than fail.
    expect(fs.existsSync(path.join(REPO, 'lib', 'tenant.ts'))).toBe(true);
    expect(files.some((f) => IMPORTS_TENANT.test(f.src))).toBe(true);
  });

  it('has no client module importing the tenant SSOT', () => {
    const offenders = files
      .filter((f) => isClientModule(f.src) && IMPORTS_TENANT.test(f.src))
      .map((f) => path.relative(REPO, f.file));

    // Pass the value in as a prop from the server component that renders it.
    expect(offenders).toEqual([]);
  });
});
