import type { Evidence, EvidenceKind } from '@/lib/research';
import { translator, type Locale, type MessageKey } from '@/lib/i18n';

/**
 * One claim, with its provenance attached.
 *
 * The badge is not styling. AGENTS.md rule 1 says a number that cannot be
 * sourced must be labelled an assumption *in the same sentence*; on a page,
 * "the same sentence" means the label cannot be somewhere the eye can skip.
 * So the kind renders before the claim, in words — never colour alone, which
 * would leave a colour-blind reader unable to tell a measurement from a guess
 * (WCAG 1.4.1).
 *
 * The `limit` renders too, and deliberately. Every claim here has a reading it
 * does not support, and the honest place for that is next to the claim rather
 * than in a footnote nobody reaches.
 */
const BADGE_KEY: Record<EvidenceKind, MessageKey> = {
  published: 'site.research.published',
  measured: 'site.research.measured',
  assumption: 'site.research.assumption',
};

export function EvidenceCard({ evidence, locale }: { evidence: Evidence; locale: Locale }) {
  const t = translator(locale);
  const { kind, claim, value, source, limit } = evidence;
  // `claim` and `limit` are message keys, not sentences — see lib/research.ts.

  return (
    <article className="border-t border-app-cloud py-app-lg">
      <span className={`site-badge site-badge--${kind}`}>{t(BADGE_KEY[kind])}</span>

      {value && (
        <p className="site-figure mt-app-sm text-app-3xl font-bold text-app-charcoal">{value}</p>
      )}

      <p className="site-measure mt-app-sm text-app-base text-app-charcoal">{t(claim)}</p>

      {limit && (
        <p className="site-measure mt-app-sm text-app-sm text-app-granite">
          <span className="font-semibold">{t('site.research.limit')}:</span> {t(limit)}
        </p>
      )}

      {source && (
        <p className="mt-app-sm text-app-sm">
          <a
            href={source.url}
            rel="noreferrer"
            className="text-brand underline underline-offset-2 hover:text-brand-hover"
          >
            {source.publisher}
            {source.year !== null && ` (${source.year})`}
          </a>
          <span className="text-app-granite"> — {source.title}</span>
        </p>
      )}
    </article>
  );
}
