/**
 * The evidence base — SSOT for every empirical claim this product makes.
 *
 * WHY THIS IS A MODULE AND NOT PROSE
 *
 * AGENTS.md rule 1: "Never state a number without a citable source. If it
 * cannot be sourced, label it an assumption in the same sentence." That rule
 * exists because three fabricated statistics survived in the README for months
 * — and a rule that lives only in a document depends on whoever writes the next
 * paragraph remembering it.
 *
 * So the claims are DATA. Every entry carries its own source or is typed as an
 * assumption, and `lib/__tests__/research.test.ts` fails the build if a
 * `measured` or `published` claim has no URL. The rule is now a check.
 *
 * THE THESIS, AND WHY IT CHANGED
 *
 * The old pitch was "report within 30 minutes and recovery jumps above 70%".
 * That number could not be sourced anywhere — not academically, not from an
 * operator, not from a vendor — and two findings actively contradict the story
 * it tells:
 *
 *   1. The incumbent (RUBICON Nova Find, in service since 2004) re-matches
 *      open loss reports against later finds continuously. A report filed on
 *      day three is not penalised. "Report fast or lose it forever" was never
 *      true.
 *   2. The operator's own figures show roughly 180,000 loss reports chasing
 *      roughly 120,000 handed-in items. The shortfall is not a matching
 *      failure. It is items that never reach the operator at all.
 *
 * So matching is the part that already works, and speed is not the binding
 * constraint. The binding constraint is the items reported lost that are never
 * handed in.
 *
 * WHAT THE EVIDENCE ACTUALLY SUPPORTS
 *
 * Cohn et al. (Science, 2019) turned in over 17,000 wallets across 355 cities
 * in 40 countries. Return rates rose with the money inside — 40% empty, 51%
 * with money, 72% with a large sum — the opposite of what self-interest
 * predicts. The authors attribute it to altruistic concern plus an aversion to
 * seeing oneself as a thief.
 *
 * The design detail that matters most here is easy to miss: each wallet
 * contained a business card with the owner's EMAIL ADDRESS. The experiment
 * measures what people do WHEN A CHANNEL TO THE OWNER EXISTS. Given one,
 * between 40% and 72% of strangers used it.
 *
 * A jacket on a seat has no business card. The finder's only route is to carry
 * it to a counter, which costs them a detour. That is the gap this product
 * addresses: not honesty, not matching speed — the missing channel between the
 * person holding an item and the person who lost it.
 *
 * That reframing is the difference between a claim we cannot support and one
 * the literature does.
 */

import type { MessageKey } from './i18n/messages';

/** How much weight a claim can carry. */
export type EvidenceKind =
  /** Measured in this repository, from data that ships with it. Reproducible. */
  | 'measured'
  /** Published by a citable third party. */
  | 'published'
  /** Reasoned from mechanism, NOT observed. Must read as an assumption wherever shown. */
  | 'assumption';

export type Source = {
  readonly publisher: string;
  readonly title: string;
  readonly url: string;
  /** Publication year, or the year the figure describes. `null` when the source is undated. */
  readonly year: number | null;
};

export type Evidence = {
  readonly id: string;
  readonly kind: EvidenceKind;
  /**
   * The claim, in one sentence, as it may be stated publicly.
   *
   * A key, not a sentence. These render on a site that is German first, and
   * an English sentence stored here renders as an English sentence under a
   * German heading — which is exactly what happened before this changed.
   * `MessageKey` is derived from the German catalogue, so an evidence entry
   * whose claim has not been translated into all four languages does not
   * compile.
   */
  readonly claim: MessageKey;
  /**
   * The figure, formatted for display. Absent when the claim is qualitative.
   *
   * Digits and units only — no words. A value like "180,000 reported" would
   * be an English fragment that no catalogue can reach, sitting inside a
   * field the type system believes is language-neutral.
   */
  readonly value?: string;
  /** Required for `measured` and `published`. Absent only for `assumption`. */
  readonly source?: Source;
  /** What the claim does NOT support — the guard against over-reading it. */
  readonly limit?: MessageKey;
};

const SCIENCE_COHN: Source = {
  publisher: 'Science',
  title: 'Cohn, Maréchal, Tannenbaum & Zünd — Civic honesty around the globe',
  url: 'https://www.science.org/doi/10.1126/science.aau8712',
  year: 2019,
};

export const EVIDENCE: readonly Evidence[] = [
  // ── The gap ───────────────────────────────────────────────────────────────
  {
    id: 'items-handed-in',
    kind: 'published',
    claim: 'research.items-handed-in.claim',
    value: '~130 000',
    source: {
      publisher: 'watson',
      title: 'Fundgegenstände im Zug: SBB erhöht Preise für verlorene Dinge',
      url: 'https://www.watson.ch/schweiz/oev/327531280-fundgegenstaende-im-zug-sbb-erhoeht-preise-fuer-verlorene-dinge',
      year: 2024,
    },
  },
  {
    id: 'reunited-share',
    kind: 'published',
    claim: 'research.reunited-share.claim',
    value: '~60%',
    source: {
      publisher: 'SWI swissinfo.ch',
      title: 'Der Fundus der SBB-Fundsachen gleicht einer Wundertüte',
      url: 'https://www.swissinfo.ch/ger/fundus-der-sbb-fundsachen-gleicht-einer-wundertuete/43375672',
      year: 2024,
    },
    limit: 'research.reunited-share.limit',
  },
  {
    id: 'reports-vs-finds',
    kind: 'published',
    claim: 'research.reports-vs-finds.claim',
    value: '~180 000 / ~120 000',
    source: {
      publisher: 'RUBICON',
      title: 'Lost property service — Nova Find',
      url: 'https://www.rubicon.eu/en/portfolio-item/lost-property-service-osterreichische-bundesbahnen/',
      year: null,
    },
    limit: 'research.reports-vs-finds.limit',
  },

  // ── Why the gap is a channel problem, not an honesty problem ──────────────
  {
    id: 'wallet-return-empty',
    kind: 'published',
    claim: 'research.wallet-return-empty.claim',
    value: '40%',
    source: SCIENCE_COHN,
  },
  {
    id: 'wallet-return-money',
    kind: 'published',
    claim: 'research.wallet-return-money.claim',
    value: '51%',
    source: SCIENCE_COHN,
    limit: 'research.wallet-return-money.limit',
  },
  {
    id: 'wallet-return-big-money',
    kind: 'published',
    claim: 'research.wallet-return-big-money.claim',
    value: '72%',
    source: SCIENCE_COHN,
  },
  {
    id: 'wallet-channel',
    kind: 'published',
    claim: 'research.wallet-channel.claim',
    source: SCIENCE_COHN,
    limit: 'research.wallet-channel.limit',
  },
  {
    id: 'wallet-mechanism',
    kind: 'published',
    claim: 'research.wallet-mechanism.claim',
    source: SCIENCE_COHN,
  },

  // ── Why paying finders is not on the table ────────────────────────────────
  {
    id: 'no-rewards',
    kind: 'published',
    claim: 'research.no-rewards.claim',
    source: {
      publisher: 'American Economic Review',
      title: 'Frey & Oberholzer-Gee — The Cost of Price Incentives',
      url: 'https://www.jstor.org/stable/2951373',
      year: 1997,
    },
    limit: 'research.no-rewards.limit',
  },

  // ── Measured here ─────────────────────────────────────────────────────────
  {
    id: 'journeys-loaded',
    kind: 'measured',
    claim: 'research.journeys-loaded.claim',
    value: '6 704 / 9 034',
    source: {
      publisher: 'Open Data Platform Mobility Switzerland',
      title: 'GTFS timetable feed (opentransportdata.swiss)',
      url: 'https://opentransportdata.swiss/en/dataset/timetable-2024-gtfs2020',
      year: 2024,
    },
    limit: 'research.journeys-loaded.limit',
  },

  // ── Stated as an assumption, on purpose ───────────────────────────────────
  {
    id: 'time-window',
    kind: 'assumption',
    claim: 'research.time-window.claim',
    limit: 'research.time-window.limit',
  },
] as const;

export const EVIDENCE_BY_ID: Readonly<Record<string, Evidence>> = Object.freeze(
  Object.fromEntries(EVIDENCE.map((e) => [e.id, e])),
);

/** Claims safe to publish as fact — everything else must be framed as an assumption. */
export function citableEvidence(): readonly Evidence[] {
  return EVIDENCE.filter((e) => e.kind !== 'assumption');
}

export function assumptions(): readonly Evidence[] {
  return EVIDENCE.filter((e) => e.kind === 'assumption');
}

/** Distinct sources, for a bibliography. */
export function sources(): readonly Source[] {
  const seen = new Map<string, Source>();
  for (const e of EVIDENCE) if (e.source) seen.set(e.source.url, e.source);
  return [...seen.values()];
}
