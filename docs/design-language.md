# Design language — where the tokens actually come from

This is the one file in the repository allowed to name the livery operator
while discussing design, because it is documentation rather than code.
`scripts/check-tenant-ssot.sh` scans `app/`, `components/` and `lib/`; `docs/`
is deliberately outside that scan, and that is the point — the *components*
must stay operator-neutral in their comments as well as their code, or the next
person reads "shaped like SBB's header" and treats a tenant-agnostic layout as
SBB-only.

## The palette was already theirs

The neutral scale in `app/globals.css` is not a coincidence and was not
eyeballed. Its token **names and values are SBB's**, from the Lyne design
tokens:

| Token | Value | Lyne name |
|---|---|---|
| `--app-charcoal` | `#212121` | `charcoal` |
| `--app-iron` | `#444444` | `iron` |
| `--app-anthracite` | `#5a5a5a` | `anthracite` |
| `--app-granite` | `#686868` | `granite` |
| `--app-metal` | `#767676` | `metal` |
| `--app-smoke` | `#8d8d8d` | `smoke` |
| `--app-storm` | `#a8a8a8` | `storm` |
| `--app-graphite` | `#b7b7b7` | `graphite` |
| `--app-cement` | `#bdbdbd` | `cement` |
| `--app-platinum` | `#cdcdcd` | `platinum` |
| `--app-aluminum` | `#d2d2d2` | `aluminium` |
| `--app-silver` | `#dcdcdc` | `silver` |
| `--app-cloud` | `#e5e5e5` | `cloud` |
| `--app-milk` | `#f6f6f6` | `milk` |

The brand reds in the `sbb` tenant block are Lyne's too: `red #eb0000`,
`red125 #c60018` (hover), `red150 #a20013` (active).

Source: <https://github.com/sbb-design-systems/lyne-design-tokens>,
`designTokens/color.ts`.

## What was missing was the typography, not the red

The palette had been right for a long time while the pages still did not look
like the operator's. The reason is that their brand is carried mostly by
**typographic metrics**, and those were generic:

| | Was | Now (Lyne) |
|---|---|---|
| Body line-height | 1.5 | **1.75** |
| Body letter-spacing | 0 | **0.03em** |
| Heading line-height | 1.5 | **1.4** |
| Heading letter-spacing | 0 | **0** |

Body copy set at 1.75 with a sliver of tracking is unusually airy, and that
airiness is most of what a reader recognises. The scale is theirs as well —
12, 13, 14, 16, 18, 20, 24, 32, 40, 48, 56, 64 — mirrored into
`tailwind.config.js` so a `text-app-*` utility cannot quietly emit a different
line-height and opt out of the brand.

The split at 20px (below it body metrics, at and above it heading metrics) is
**ours**. Lyne publishes the two pairs but not which sizes take which.

Source: <https://digital.sbb.ch/en/design-system/lyne/design-tokens/typography/>

## The typeface

`--font-brand` is `'SBB'`, first in a stack that then falls through to Inter,
Helvetica Neue, Helvetica and Arial — exactly the fallback chain Lyne itself
declares.

**Nothing is fetched from the operator's CDN.** Their corporate face is
licensed; a machine that already has it installed will use it, and every other
machine gets the same fallback the operator's own stack specifies. Hotlinking a
licensed font onto a pitch artefact is not a thing this repository does.

## The page chrome

The header and footer follow the shape of the operator's public site: a white
ground with a hairline rule, wordmark hard left, sections beside it, service
controls (language, then the primary action) hard right; then a footer of link
columns on a milk ground above a legal row.

Two things worth recording, because both were decisions rather than
observations:

- **No coloured header bar.** The operator spends red on the primary action and
  almost nothing else, which is why their pages read as calm. Painting the red
  across a full-width bar is the usual way a "make it look like theirs" attempt
  ends up looking like a budget airline.
- **No invented footer links.** Their real footer carries Impressum,
  Datenschutz, Barrierefreiheit and a dozen more. Reproducing that shape with
  links to pages this project does not have would be the footer equivalent of a
  mock that renders as real data. The columns hold what exists.

## This is still tenant-agnostic

Everything above is expressed as tokens and layout, not as operator-specific
components. The neutral house tenant renders the same chrome in its own blue
and looks correct doing it — which is the test that the layout is a pattern
rather than an impersonation. `pnpm run check:tenant` enforces the code side of
that, and the reason component comments here avoid naming an operator is the
same reason the code does.
