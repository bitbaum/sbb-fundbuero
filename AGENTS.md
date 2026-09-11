# AGENTS.md — Nordbahn Fundbüro

@~/.claude/CLAUDE.md

Working guide for this repository. `CLAUDE.md` is a symlink to this file; there
is one copy, not three.

This file records **decisions that are load-bearing** — the ones where doing the
obvious thing instead would quietly break something — and a **must-not-do list**.
It is not a tour of the codebase; read the code for that.

---

## What this is, honestly

A **concept**, not an operational service. A passenger reports a loss while
still on the train; staff are notified in real time and can search before the
vehicle reaches the depot.

The repository is mid-rebuild. `TODO.md` is the authority on what is a launch
blocker and what is not. `README.md` is the authority on which parts are
implemented, which are fixtures, and which are assumptions.

**SBB already runs a lost-property service.** RUBICON's Nova Find has run it
since 2004, it returns roughly 60% of handed-in items, and it already
re-matches open loss reports against later finds automatically. This project is
not a replacement for it and must never be described as one.

---

## Must not do

1. **Never state a number without a citable source.** Not in the README, not in
   the UI, not in a commit message. If it cannot be sourced, label it an
   assumption in the same sentence. Three fabricated statistics survived in this
   README for months because nobody made this rule explicit.
2. **Never mock an integration so that it looks live.** A fixture labelled as a
   fixture is honest. A mock that renders as real data is not. This repo has
   done the dishonest version before — see "The fallback that could not fail"
   below.
3. **Never let a description-similarity score outrank an identifier or a trip
   match.** See "Matching is identifier-first". This includes CANDIDATE
   SELECTION: `lib/server/matching-service.ts` finds candidates by identifier,
   journey or line only. Fetching every item of the same category and ranking
   it by word overlap is how a matcher ends up confidently sorting a thousand
   black umbrellas.
4. **Never put personal data in a staff event payload.** `/api/events` goes to
   every connected crew device; it carries a reference, a category and a
   location, never a description, a contact detail or an identifier value.
5. **Never make found-item details public.** A public listing naming a recovered
   phone is a shopping list.
6. **Never add a reward or payment field.** A Swiss transport operator is
   legally barred from claiming a finder's reward (VPB Art. 77 Abs. 2, SR
   745.11), and offering money for prosocial behaviour is a well-documented way
   to reduce it (Frey & Oberholzer-Gee 1997).
7. **Never hardcode an operator's name outside the tenant SSOT.** `pnpm run
   check:tenant` fails the build if you do.
8. **Never cache personal data in a service worker.** Offline queueing is fine;
   persisting someone's contact details on a shared phone is not.
9. **Never commit with `pnpm run verify` red.**

---

## Load-bearing decisions

### The tenant SSOT — the operator is configuration, not code

An operator's identity lives in exactly two places:

| File | Owns |
|---|---|
| `lib/tenant.ts` | Wordmark, legal name, product name, locale, operator code, theme colour |
| `app/globals.css` | Palette + font, one `:root[data-tenant="…"]` block per operator |

`<html data-tenant>` is set once in `app/layout.tsx`; every colour token keys off
it, so the palette flips at runtime from one attribute. Adding an operator is
two edits — a `TENANTS` entry and one CSS override block restating only the
tokens that differ. **Never a component change.**

`scripts/check-tenant-ssot.sh` enforces this and runs inside `pnpm run verify`.
It exists because the codebase previously spread one operator's name across 600+
references, and nothing would have failed if that crept back — the app would
just have quietly stopped being re-brandable.

**Trademark safety.** A tenant with `isConcept: true` uses a third-party
trademark, so it is a pitch artefact, not a product: those builds render an
"unabhängiges Konzept" notice on every screen and emit `robots: noindex`. The
neutral house brand is the default, including when `NEXT_PUBLIC_TENANT` is unset
or misspelled — failing open to someone else's brand is the one failure mode
that carries real cost.

### Matching is identifier-first, then spacetime, then description

In that order, and the order is the point.

1. **Identifier** — serial, IMEI, engraving, registration, last 4 of an IBAN. An
   exact identifier match plus a plausible trip is near-certain.
2. **Spacetime** — trip, coach, seat, time window. A journey collapses the
   search space in a way a city street cannot. This is the product's core
   technical advantage; do not generalise it away.
3. **Description and images** — supporting evidence only.

Description similarity is a weak signal and must never outrank the first two.
"Black umbrella" sits close to every other black umbrella in embedding space and
produces a confident-looking score over noise. This is geometry, not a data
problem: random words average near-perfect cosine similarity (Ethayarajh 2019),
high-frequency vocabulary collapses into a dense blob (Li et al. 2020), and in
high dimensions some points become everyone's nearest neighbour (Radovanović et
al. 2010). Fellegi & Sunter (1969) is the formal statement of why a rare value
carries weight and a common one does not.

Every match persists a **score breakdown** — deterministic arithmetic, each
signal's contribution visible. Staff and passengers must be able to see why two
records were linked. No opaque model output in the matching path.

### Ownership requires a challenge

Found-item details are private by default. A claim is an assertion with
evidence, resolved by a **challenge**: the claimant describes something the
listing does not show — a lock screen, a scratch, what is in the side pocket.
Resolution carries a confidence level and a named resolver, and is logged.

Anything less means anyone who sees a found item can claim it.

### Retention is a column, not a paragraph

Reports, images and contact details carry a deletion deadline as a database
column, with a scheduled purge. Retention enforced by documentation is retention
that does not happen.

Legal basis: items found on transport premises must be handed to staff (ZGB Art.
720 Abs. 3, SR 210); the operator counts as finder but may claim no finder's
reward, must notify a known loser, and may auction after three months — one
month if the item is worth ≤ CHF 50 (VPB Art. 77, SR 745.11).

### Staff routes fail closed

`lib/server/auth.ts` checks a single shared secret on every staff route. With
`STAFF_ACCESS_TOKEN` unset it returns 503 and refuses — never "nothing is
configured, so allow everything", which is how `/staff` came to be readable by
anyone with the URL. It is not per-person authentication and does not claim to
be; `TODO.md` carries accounts as the remaining work.

503 rather than 401 when unconfigured, on purpose: the caller did nothing wrong
and a different token will not help.

Scheduled jobs use the same shape with a second secret. `authoriseCron` checks
`CRON_SECRET`, bearer form only, and `POST /api/cron/purge` is its one caller.
The production release is a Next standalone build with no `scripts/` and no
`tsx`, so a job that must run on the box has to be a route the box's timer can
call (fleetcrown `install-app-crons.sh`) — the purge is, and its logic lives in
`lib/server/purge.ts` so the script and the route are two callers of one
function. The same constraint is why the timetable import is NOT a cron yet: a
248 MB download and a 3 GB stream-parse is not an HTTP request.

### Staff push is SSE, and the bus is in-process

One direction, plain HTTP, browser-owned reconnect. The limit is stated rather
than discovered later: the event bus is an `EventEmitter` in the process, so
two app processes would each notify only their own subscribers. That is fine
for one systemd unit on one box, and it is the first thing to change if that
stops being true — at which point a broker earns its place, and not before.

### The fallback that could not fail

`useApiWithFallback` catches any API error **and any `success: false`** and
substitutes `lib/mock-data.ts`, setting `error` to `null` on that path. The UI
therefore has no way to render "backend down" — it renders a complete,
persuasive product with no backend at all.

`config.demo.enabled` is now honest about this: demo mode is on whenever no
backend is configured, so running on fixtures is a declared state rather than a
fallback reached by letting a request fail first. It previously read
`process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || true`, which is `true` for
every possible value of the variable.

**When the real backend lands, this hook must surface failure, not hide it.**

### No localhost fallback for API URLs

`config.api.baseUrl` has deliberately no `|| 'http://localhost:3001'` default. A
production build inlines these values into the browser bundle, so such a default
does not mean "try the dev backend" — it means every visitor's browser aims the
request at port 3001 **of their own machine**. Unset means exactly what it says:
no backend is reachable from this build.

---

## Design system

Token values live in `app/globals.css` as CSS custom properties.
`tailwind.config.js` references those vars — **no literal hex**.
`lib/design-system.ts` mirrors them for non-CSS contexts (OG images,
canvas) and must be kept in sync by hand.

```
brand / brand-hover / brand-active     tenant brand colour
app-charcoal                           primary text
app-granite                            secondary text
app-smoke                              fill only — never text
app-cloud                              borders
app-milk                               page background
app-white                              card/surface background
app-success / app-warning / app-error  functional states
app-blue / app-info                    info state
```

```
Spacing   p-app-xs 4 / sm 8 / md 16 / lg 24 / xl 32 / 2xl 48
Radius    rounded-app-sm 4 / md 8 / lg 16 / xl 24
Shadow    shadow-app-card / shadow-app-modal / shadow-app-button
```

Pre-built classes in `globals.css` — use them, do not rebuild inline:
`.btn-app-primary` `.btn-app-secondary` `.btn-app-ghost` `.card-app` `.input-app`
`.header-app` `.mobile-container` `.safe-top` `.safe-bottom` `.bottom-nav`
`.modal-overlay` `.modal-content` `.toast` `.touch-feedback` `.hide-scrollbar`

**Audit:** `grep -rn '\[#' app components lib` — every hit is a violation.

---

## Commands

```bash
pnpm install
pnpm run verify        # format + lint + typecheck + test + tenant SSOT
pnpm run dev           # http://localhost:3005
pnpm run docker:up     # Postgres
```

One app at the repository root — one `package.json`, one lockfile, no
workspace. Module boundaries are directories (`lib/domain`, `lib/db`,
`app/api`), not deployment units.

`verify` is the single definition of "green". CI calls it verbatim, so green
locally means green in CI. Do not add a check to CI that is not in `verify` — a
check you cannot run before pushing is a check that fails after pushing.

---

## Accessibility

Target **WCAG 2.2 AA**, and test it rather than assuming it. This is public
transport: keyboard navigable, screen-reader labelled, sufficient contrast, no
colour-only signalling, respects reduced motion.

`lib/__tests__/contrast.test.ts` asserts contrast ratios on the token
pairs actually used together. It caught white-on-amber at 2.15:1 on the one
badge a passenger sees while still hoping.

---

## Four languages

de, fr, it, en. Switzerland is quadrilingual and the schema already anticipates
it. `lib/labels.ts` is the SSOT for UI text but currently holds one
locale — it is a single-language SSOT, not i18n. No hardcoded strings in
components either way.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
