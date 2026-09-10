/**
 * Colour-contrast guard.
 *
 * globals.css has carried the rule in a comment since the greyscale sweep:
 * "#8D8D8D is fine as a FILL, never as text." A comment cannot enforce
 * anything, and this one was already false when it was written — the
 * `.input-app` placeholder was smoke-on-milk (3.07:1) the whole time — and
 * then MyReports added a second violation (3.32:1) on the timestamp line.
 * Same rule, broken twice, caught by nobody. So it is a test now.
 *
 * What this checks is the ground truth, not a list somebody has to maintain:
 * every colour token is read out of globals.css and its contrast is computed.
 * Add a new token, use it as text, and the ratio decides — nothing here needs
 * updating for that to work.
 *
 * It has since grown a second job, because contrast turned out to be the
 * smaller half of the problem: a ratio only describes what actually renders,
 * and this app kept shipping classes that rendered nothing at all. The last
 * two describes below are about that — see their own comments.
 *
 * The contrast properties:
 *
 *  1. Any `--app-*` colour used as TEXT must clear WCAG AA (4.5:1) against
 *     both surfaces text actually sits on: white cards and the milk page.
 *     Both are checked because --app-metal passes on white (4.54:1) and fails
 *     on milk (4.20:1) — the kind of near-miss a spot check waves through.
 *
 *  2. Every badge in ALL_BADGE_TOKENS must clear AA as a
 *     PAIR, and must be built from design tokens at all. `bg-amber-500` was
 *     both: a raw Tailwind colour outside the SSOT, and white-on-amber at
 *     2.15:1 — the worst contrast in the app.
 *
 * The badge check runs against EVERY tenant, because `--brand` is whatever an
 * operator's block says it is: a white-label app can be re-branded into a
 * contrast failure without a single line of component code changing.
 */
import fs from 'fs';
import path from 'path';

import { ALL_BADGE_TOKENS } from '../badge-tokens';

const FRONTEND = path.join(__dirname, '..', '..');
const GLOBALS_CSS = path.join(FRONTEND, 'app', 'globals.css');

/** WCAG 2.1 AA for normal-size text. Large text (1.4.3) is not relied on here. */
const AA_TEXT = 4.5;

// ---------------------------------------------------------------------------
// WCAG relative luminance / contrast (1.4.3). Plain arithmetic, no dependency.
// ---------------------------------------------------------------------------

function toChannel(srgb8: number): number {
  const c = srgb8 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const full =
    hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex.slice(0, 7);
  const n = parseInt(full.slice(1), 16);
  return (
    0.2126 * toChannel((n >> 16) & 255) +
    0.7152 * toChannel((n >> 8) & 255) +
    0.0722 * toChannel(n & 255)
  );
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const ratio = (a: string, b: string): string => contrast(a, b).toFixed(2);

// ---------------------------------------------------------------------------
// Tokens, read from the SSOT rather than restated here.
// ---------------------------------------------------------------------------

/** `:root` and each `:root[data-tenant='…']` block, as name -> hex. */
function readTokenBlocks(): { tenant: string; tokens: Record<string, string> }[] {
  const css = fs.readFileSync(GLOBALS_CSS, 'utf8');
  const blocks: { tenant: string; tokens: Record<string, string> }[] = [];

  const blockRe = /:root(?:\[data-tenant='([a-z0-9-]+)'\])?\s*\{([\s\S]*?)\n\}/g;
  for (let m = blockRe.exec(css); m !== null; m = blockRe.exec(css)) {
    const [, tenant, body] = m;
    const tokens: Record<string, string> = {};
    const declRe = /--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g;
    for (let d = declRe.exec(body); d !== null; d = declRe.exec(body)) {
      tokens[d[1]] = d[2].toLowerCase();
    }
    blocks.push({ tenant: tenant ?? 'default', tokens });
  }
  return blocks;
}

const BLOCKS = readTokenBlocks();
const DEFAULT_TOKENS = BLOCKS[0].tokens;

/** Tenant blocks inherit from `:root`, so resolve through the default. */
function tokensFor(tenant: string): Record<string, string> {
  const block = BLOCKS.find((b) => b.tenant === tenant);
  return { ...DEFAULT_TOKENS, ...(block?.tokens ?? {}) };
}

/**
 * The surfaces text is rendered on: white cards and the milk page background.
 * Read from the tokens so a re-theme cannot silently move the goalposts.
 */
const SURFACES = [
  { name: '--app-white', hex: DEFAULT_TOKENS['app-white'] },
  { name: '--app-milk', hex: DEFAULT_TOKENS['app-milk'] },
];

// ---------------------------------------------------------------------------
// Property 1 — no --app-* colour is used as text below AA.
// ---------------------------------------------------------------------------

/** Directories that contain UI class names. One list: scanned here AND by Tailwind. */
const SCANNED_DIRS = ['app', 'components', 'lib'];

function sourceFiles(): string[] {
  const roots = SCANNED_DIRS.map((d) => path.join(FRONTEND, d));
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__' && entry.name !== 'node_modules') walk(full);
      } else if (/\.(tsx?|css)$/.test(entry.name)) {
        out.push(full);
      }
    }
  };
  roots.filter(fs.existsSync).forEach(walk);
  return out;
}

describe('no --app-* colour is used as text below WCAG AA', () => {
  /** Every `text-app-x` / `placeholder:text-app-x` that names a COLOUR token. */
  const usages = sourceFiles().flatMap((file) => {
    const found: { file: string; line: number; token: string; hex: string }[] = [];
    fs.readFileSync(file, 'utf8')
      .split('\n')
      .forEach((text, i) => {
        const re = /(?:placeholder:)?text-(app-[a-z0-9-]+)/g;
        for (let m = re.exec(text); m !== null; m = re.exec(text)) {
          // Font sizes (text-app-sm) share the prefix but name no colour
          // token, so looking the name up in the SSOT filters them out.
          const hex = DEFAULT_TOKENS[m[1]];
          if (hex)
            found.push({ file: path.relative(FRONTEND, file), line: i + 1, token: m[1], hex });
        }
      });
    return found;
  });

  it('finds text-colour usages to check (guards against the scan silently breaking)', () => {
    expect(usages.length).toBeGreaterThan(0);
  });

  it.each(SURFACES)('clears $name ($hex)', ({ hex: surface }) => {
    const failures = usages
      .filter((u) => contrast(u.hex, surface) < AA_TEXT)
      .map((u) => `${u.file}:${u.line}  --${u.token} (${u.hex}) = ${ratio(u.hex, surface)}:1`);

    expect(failures).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Property 2 — status badges are token-built and legible, for every tenant.
// ---------------------------------------------------------------------------

/** `bg-app-x` / `text-white` / `bg-brand` -> hex, or null if not a token. */
function resolveClass(cls: string, tokens: Record<string, string>): string | null {
  const name = cls.replace(/^(bg|text)-/, '');
  if (name === 'white') return '#ffffff';
  if (name === 'black') return '#000000';
  return tokens[name] ?? null;
}

/**
 * A contrast ratio only describes what renders. Tailwind emits a class only if
 * it can SEE the string in its content globs, and lib/ was missing from them —
 * so `bg-app-granite` and `bg-amber-500`, which exist nowhere but
 * lib/labels.ts, were never generated at all. Two status badges shipped as
 * white text on no background while every source file looked correct, and a
 * pair-contrast check happily called them 5.57:1.
 *
 * So: anything scanned here for class names must also be scanned by Tailwind.
 */
describe('Tailwind sees every directory that names UI classes', () => {
  const config = fs.readFileSync(path.join(FRONTEND, 'tailwind.config.js'), 'utf8');
  const contentBlock = config.slice(config.indexOf('content: ['), config.indexOf('],'));

  it.each(SCANNED_DIRS)('%s is in the content globs', (dir) => {
    expect(contentBlock).toContain(`'./${dir}/`);
  });
});

/**
 * The same failure in its other form: the class is seen, and still no rule is
 * emitted. An opacity modifier (`bg-brand/10`) needs a colour Tailwind can put
 * an alpha channel into, and every colour in this config is a bare
 * `var(--token)`. Tailwind cannot compose those, so it emits NOTHING — no
 * warning, no fallback, just a transparent background.
 *
 * This shipped: the Fundservice entry point in the profile (`bg-brand/10`,
 * plus a `hover:bg-brand/15` that also did nothing) and the priority chip on
 * TripCard rendered with no highlight at all. Measured on the deployed site:
 * `backgroundColor: rgba(0, 0, 0, 0)`.
 *
 * The fix is a real token — --brand-surface and friends, derived from --brand
 * with color-mix — so the tint follows the tenant. This test exists to stop
 * the modifier syntax coming back, since it fails silently and looks correct
 * in review.
 */
describe('no colour utility uses an opacity modifier', () => {
  const OFFENDER =
    /(?:bg|text|border|ring|from|via|to|outline|divide)-(?:brand|app)[a-z-]*\/\d{1,3}/g;

  it('finds none in app/, components/ or lib/', () => {
    const hits = sourceFiles().flatMap((file) =>
      fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((text, i) =>
          (text.match(OFFENDER) ?? []).map(
            (cls) => `${path.relative(FRONTEND, file)}:${i + 1}  ${cls}`,
          ),
        ),
    );

    expect(hits).toEqual([]);
  });
});

describe('status badges are built from tokens and clear AA', () => {
  const cases = BLOCKS.flatMap(({ tenant }) =>
    Object.entries(ALL_BADGE_TOKENS).map(([status, cfg]) => ({
      tenant,
      status,
      cfg,
    })),
  );

  it.each(cases)('$tenant / $status', ({ tenant, status, cfg }) => {
    const tokens = tokensFor(tenant);
    const bg = resolveClass(cfg.color, tokens);
    const fg = resolveClass(cfg.textColor, tokens);

    // A raw palette colour (`bg-amber-500`) resolves to nothing: it is not in
    // the token SSOT, so it is rejected before contrast is even considered.
    const untokenised = [
      bg === null ? `${status}.color = "${cfg.color}"` : null,
      fg === null ? `${status}.textColor = "${cfg.textColor}"` : null,
    ].filter(Boolean);
    expect(untokenised).toEqual([]);

    // Asserted as a string so a failure prints the ratio and the pair that
    // produced it, rather than "expected 2.15 to be >= 4.5".
    const measured = `${cfg.textColor} on ${cfg.color} = ${ratio(fg!, bg!)}:1`;
    const verdict = contrast(fg!, bg!) >= AA_TEXT ? measured : `${measured} — below ${AA_TEXT}:1`;
    expect(verdict).toBe(measured);
  });
});
