import type { Metadata } from 'next';

import { EvidenceCard } from '@/components/site/EvidenceCard';
import { translate, translator } from '@/lib/i18n';
import { resolveLocale } from '@/lib/i18n/server';
import { assumptions, citableEvidence, sources } from '@/lib/research';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  return { title: translate(locale, 'site.nav.research') };
}

/**
 * The evidence base, rendered from the module that holds it.
 *
 * This page has no hand-written claims at all — it maps over `lib/research.ts`.
 * The consequence is the point: a claim cannot appear here without first
 * existing as a typed entry with a source, and `lib/__tests__/research.test.ts`
 * fails the build if a `measured` or `published` entry has no URL. Adding an
 * unsourced number to the website is therefore not a thing a person can
 * accidentally do.
 *
 * Assumptions render in their own section, after the citable claims and under
 * their own heading, so the boundary between what is known and what is
 * reasoned is a structural feature of the page rather than an adverb.
 */
export default async function Page() {
  const locale = await resolveLocale();
  const t = translator(locale);

  return (
    <>
      <section className="site-width py-app-2xl md:py-20">
        <h1 className="site-measure text-app-3xl font-bold leading-tight tracking-tight text-app-charcoal md:text-5xl md:leading-[1.1]">
          {t('site.research.title')}
        </h1>
        <p className="site-measure mt-app-lg text-app-lg text-app-granite">
          {t('site.research.lead')}
        </p>
        <p className="site-measure mt-app-lg rounded-app-lg bg-app-milk p-app-lg text-app-sm text-app-charcoal">
          {t('site.research.noNumber')}
        </p>
      </section>

      <section className="site-width pb-app-2xl">
        {citableEvidence().map((e) => (
          <EvidenceCard key={e.id} evidence={e} locale={locale} />
        ))}
      </section>

      <section className="site-rule bg-app-milk py-app-2xl md:py-20">
        <div className="site-width">
          <h2 className="text-app-2xl font-bold tracking-tight text-app-charcoal">
            {t('site.research.assumption')}
          </h2>
          {assumptions().map((e) => (
            <EvidenceCard key={e.id} evidence={e} locale={locale} />
          ))}
        </div>
      </section>

      {/* ── Bibliography ───────────────────────────────────────────────────── */}
      <section className="site-width py-app-2xl md:py-20">
        <h2 className="text-app-2xl font-bold tracking-tight text-app-charcoal">
          {t('site.research.sources')}
        </h2>
        <ul className="mt-app-lg space-y-app-md">
          {sources().map((s) => (
            <li key={s.url} className="site-measure text-app-sm">
              <a
                href={s.url}
                rel="noreferrer"
                className="text-brand underline underline-offset-2 hover:text-brand-hover"
              >
                {s.title}
              </a>
              <span className="text-app-granite">
                {' '}
                — {s.publisher}
                {s.year !== null && `, ${s.year}`}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
