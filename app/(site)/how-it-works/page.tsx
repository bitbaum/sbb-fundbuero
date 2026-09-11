import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';

import { NOTIFY_CAPABILITIES, type CapabilityStatus } from '@/lib/capabilities';
import { localeFromAcceptLanguage, translate, translator, type MessageKey } from '@/lib/i18n';
import { EVIDENCE_BY_ID } from '@/lib/research';

export async function generateMetadata(): Promise<Metadata> {
  const locale = localeFromAcceptLanguage((await headers()).get('accept-language'));
  return { title: translate(locale, 'site.nav.how') };
}

/**
 * How a report reaches the people who can act on it.
 *
 * Two things this page must not do.
 *
 * It must not describe the notification model as though it were all running.
 * AGENTS.md rule 2 forbids a mock that renders as real data; a marketing page
 * claiming a crew integration that does not exist is the same offence with a
 * larger audience. So the statuses come from `lib/capabilities.ts`, which
 * `lib/__tests__/capabilities.test.ts` checks against the filesystem — the
 * page cannot drift ahead of the code.
 *
 * And it must not soften what is deliberately absent. The two refusals —
 * public listings and finder's rewards — are product decisions with reasons
 * (AGENTS.md rules 5 and 6), not features awaiting a roadmap, and they read
 * better as refusals than as omissions.
 */

/** Refusals carry no badge: a badge would file them under work-in-progress. */
const STATUS_LABEL: Record<CapabilityStatus, MessageKey | null> = {
  built: 'site.status.built',
  designed: 'site.status.designed',
  refused: null,
};

const STATUS_CLASS: Record<CapabilityStatus, string> = {
  built: 'site-badge--measured',
  designed: 'site-badge--assumption',
  refused: '',
};

export default async function Page() {
  const locale = localeFromAcceptLanguage((await headers()).get('accept-language'));
  const t = translator(locale);
  const timeWindow = EVIDENCE_BY_ID['time-window'];

  return (
    <>
      <section className="site-width py-app-2xl md:py-20">
        <h1 className="site-measure text-app-3xl font-bold leading-tight tracking-tight text-app-charcoal md:text-5xl md:leading-[1.1]">
          {t('site.steps.title')}
        </h1>

        <ol className="mt-app-2xl grid gap-app-xl md:grid-cols-3">
          {(['1', '2', '3'] as const).map((n) => (
            <li key={n} className="border-t-2 border-brand pt-app-md">
              <p className="site-figure text-app-2xl font-bold text-app-granite">{n}</p>
              <h2 className="mt-app-sm text-app-lg font-semibold text-app-charcoal">
                {t(`site.steps.${n}.title` as MessageKey)}
              </h2>
              <p className="mt-app-sm text-app-sm text-app-granite">
                {t(`site.steps.${n}.body` as MessageKey)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Why "while still aboard", stated as the assumption it is ────────── */}
      <section className="site-rule bg-app-milk py-app-2xl md:py-20">
        <div className="site-width">
          {/* This block exists to keep the product honest about its own core
              premise. The reason to report early is reasoned from mechanism,
              not measured — and `lib/research.ts` types it `assumption`, so
              the badge here cannot disagree with the evidence base. */}
          <span className="site-badge site-badge--assumption">{t('site.research.assumption')}</span>
          <p className="site-measure mt-app-md text-app-lg text-app-charcoal">
            {t(timeWindow.claim)}
          </p>
          <p className="site-measure mt-app-md text-app-sm text-app-granite">
            <span className="font-semibold">{t('site.research.limit')}:</span>{' '}
            {t(timeWindow.limit!)}
          </p>
        </div>
      </section>

      {/* ── Who is notified ────────────────────────────────────────────────── */}
      <section className="site-width py-app-2xl md:py-20">
        <h2 className="site-measure text-app-2xl font-bold tracking-tight text-app-charcoal md:text-app-3xl">
          {t('site.notify.title')}
        </h2>
        <p className="site-measure mt-app-md text-app-sm text-app-granite">
          {t('site.status.lead')}
        </p>

        <ul className="mt-app-xl">
          {NOTIFY_CAPABILITIES.map((c) => {
            const label = STATUS_LABEL[c.status];
            return (
              <li
                key={c.id}
                className="grid gap-app-sm border-t border-app-cloud py-app-lg md:grid-cols-[1fr_2fr]"
              >
                <div>
                  <h3 className="text-app-base font-semibold text-app-charcoal">{t(c.titleKey)}</h3>
                  {label && (
                    <span className={`site-badge mt-app-sm ${STATUS_CLASS[c.status]}`}>
                      {t(label)}
                    </span>
                  )}
                </div>
                <p className="site-measure text-app-sm text-app-granite">{t(c.noteKey)}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="site-rule site-width py-app-2xl">
        <Link
          href="/app"
          className="inline-block rounded-app-md bg-brand px-app-lg py-3 text-app-base font-semibold text-brand-contrast hover:bg-brand-hover"
        >
          {t('site.hero.cta')}
        </Link>
      </section>
    </>
  );
}
