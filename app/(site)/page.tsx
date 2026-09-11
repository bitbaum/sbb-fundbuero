import Link from 'next/link';
import { headers } from 'next/headers';

import { localeFromAcceptLanguage, translator } from '@/lib/i18n';
import { EVIDENCE_BY_ID } from '@/lib/research';

/**
 * The landing page.
 *
 * Every figure on it is read out of `lib/research.ts` rather than typed into
 * the copy. That is not tidiness: a number typed into a paragraph is a number
 * whose source lives somewhere else and can rot away from it silently, which
 * is exactly how three fabricated statistics survived in the README for
 * months. Read from the SSOT and the source is structurally inseparable from
 * the figure — you cannot render one without the other being on file.
 *
 * The argument the page makes, in order:
 *   1. matching already works, so speed is not the pitch;
 *   2. the gap is items never handed in;
 *   3. the literature says that gap is a missing channel, not dishonesty;
 *   4. here is the channel.
 */
export default async function Page() {
  const locale = localeFromAcceptLanguage((await headers()).get('accept-language'));
  const t = translator(locale);

  const gap = EVIDENCE_BY_ID['reports-vs-finds'];
  const reunited = EVIDENCE_BY_ID['reunited-share'];
  const wallets = [
    EVIDENCE_BY_ID['wallet-return-empty'],
    EVIDENCE_BY_ID['wallet-return-money'],
    EVIDENCE_BY_ID['wallet-return-big-money'],
  ];

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="site-width py-app-2xl md:py-24">
        <h1 className="site-measure text-app-3xl font-bold leading-tight tracking-tight text-app-charcoal md:text-5xl md:leading-[1.1]">
          {t('site.hero.title')}
        </h1>
        <p className="site-measure mt-app-lg text-app-lg text-app-granite">{t('site.hero.lead')}</p>

        <div className="mt-app-xl flex flex-wrap gap-app-md">
          <Link
            href="/app"
            className="rounded-app-md bg-brand px-app-lg py-3 text-app-base font-semibold text-brand-contrast hover:bg-brand-hover"
          >
            {t('site.hero.cta')}
          </Link>
          <Link
            href="/research"
            className="rounded-app-md border border-app-cloud px-app-lg py-3 text-app-base font-semibold text-app-charcoal hover:bg-app-milk"
          >
            {t('site.hero.ctaSecondary')}
          </Link>
        </div>
      </section>

      {/* ── The gap ────────────────────────────────────────────────────────── */}
      <section className="site-rule bg-app-milk py-app-2xl md:py-20">
        <div className="site-width">
          <h2 className="site-measure text-app-2xl font-bold tracking-tight text-app-charcoal md:text-app-3xl">
            {t('site.problem.title')}
          </h2>
          <p className="site-measure mt-app-md text-app-base text-app-granite">
            {t('site.problem.body')}
          </p>

          <dl className="mt-app-xl grid gap-app-lg sm:grid-cols-2">
            <div className="rounded-app-lg bg-app-white p-app-lg">
              <dt className="text-app-sm text-app-granite">{t('site.problem.gapLabel')}</dt>
              <dd className="site-figure mt-app-sm text-app-3xl font-bold text-app-charcoal">
                {gap.value}
              </dd>
              <dd className="mt-app-sm text-app-xs text-app-granite">
                <a
                  href={gap.source!.url}
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-app-charcoal"
                >
                  {gap.source!.publisher}
                </a>
              </dd>
            </div>
            <div className="rounded-app-lg bg-app-white p-app-lg">
              <dt className="text-app-sm text-app-granite">{t(reunited.claim)}</dt>
              <dd className="site-figure mt-app-sm text-app-3xl font-bold text-app-charcoal">
                {reunited.value}
              </dd>
              <dd className="mt-app-sm text-app-xs text-app-granite">
                <a
                  href={reunited.source!.url}
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-app-charcoal"
                >
                  {reunited.source!.publisher}
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ── The thesis ─────────────────────────────────────────────────────── */}
      <section className="site-width py-app-2xl md:py-20">
        <h2 className="site-measure text-app-2xl font-bold tracking-tight text-app-charcoal md:text-app-3xl">
          {t('site.thesis.title')}
        </h2>
        <p className="site-measure mt-app-md text-app-base text-app-granite">
          {t('site.thesis.body')}
        </p>

        {/* The three rates, in the order that makes the point: they RISE with
            the money inside. Shown as a row so the direction is visible
            without reading the sentence. */}
        <ul className="mt-app-xl grid gap-app-md sm:grid-cols-3">
          {wallets.map((w) => (
            <li key={w.id} className="rounded-app-lg border border-app-cloud p-app-lg">
              <p className="site-figure text-app-3xl font-bold text-brand">{w.value}</p>
              <p className="mt-app-sm text-app-sm text-app-granite">{t(w.claim)}</p>
            </li>
          ))}
        </ul>

        <p className="mt-app-md text-app-sm text-app-granite">
          {t('site.thesis.source')}:{' '}
          <a
            href={wallets[0].source!.url}
            rel="noreferrer"
            className="text-brand underline underline-offset-2 hover:text-brand-hover"
          >
            {wallets[0].source!.title} ({wallets[0].source!.year})
          </a>
        </p>
      </section>

      {/* ── The channel ────────────────────────────────────────────────────── */}
      <section className="site-rule site-dark py-app-2xl md:py-20">
        <div className="site-width">
          <h2 className="site-measure text-app-2xl font-bold tracking-tight md:text-app-3xl">
            {t('site.steps.title')}
          </h2>
          <ol className="mt-app-xl grid gap-app-lg md:grid-cols-3">
            {(['1', '2', '3'] as const).map((n) => (
              <li key={n}>
                <p className="site-figure site-dark-faint text-app-2xl font-bold">{n}</p>
                <h3 className="mt-app-sm text-app-lg font-semibold">
                  {t(`site.steps.${n}.title` as const)}
                </h3>
                {/* The app's `text-app-*` greys are tuned for white and milk
                    and are checked against those two surfaces, so none of them
                    can be used here. `.site-dark-muted` is declared alongside
                    the surface in globals.css and checked against it. */}
                <p className="site-dark-muted mt-app-sm text-app-sm">
                  {t(`site.steps.${n}.body` as const)}
                </p>
              </li>
            ))}
          </ol>

          <p className="mt-app-xl">
            <Link
              href="/how-it-works"
              className="text-app-base font-semibold underline underline-offset-4 hover:opacity-80"
            >
              {t('site.nav.how')} →
            </Link>
          </p>
        </div>
      </section>

      {/* ── The standard ───────────────────────────────────────────────────── */}
      <section className="site-width py-app-2xl md:py-20">
        <h2 className="site-measure text-app-2xl font-bold tracking-tight text-app-charcoal md:text-app-3xl">
          {t('site.research.title')}
        </h2>
        <p className="site-measure mt-app-md text-app-base text-app-granite">
          {t('site.research.lead')}
        </p>
        <p className="site-measure mt-app-md rounded-app-lg bg-app-milk p-app-lg text-app-sm text-app-charcoal">
          {t('site.research.noNumber')}
        </p>
        <p className="mt-app-lg">
          <Link
            href="/research"
            className="text-app-base font-semibold text-brand underline underline-offset-4 hover:text-brand-hover"
          >
            {t('site.hero.ctaSecondary')} →
          </Link>
        </p>
      </section>
    </>
  );
}
