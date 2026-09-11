import Link from 'next/link';

import { LanguageSwitcher } from '@/components/site/LanguageSwitcher';
import { translator, type Locale, type MessageKey } from '@/lib/i18n';
import { tenant } from '@/lib/tenant';

/** Where the claims on this site can be checked. */
const REPO_URL = 'https://github.com/bitbaum/sbb-fundbuero';

const SECTIONS: ReadonlyArray<{ href: string; key: MessageKey }> = [
  { href: '/how-it-works', key: 'site.nav.how' },
  { href: '/research', key: 'site.nav.research' },
  { href: '/app', key: 'site.nav.app' },
];

/**
 * Link columns on a milk ground, then a legal row beneath a rule — the
 * footer shape these sites share.
 *
 * Two decisions worth stating.
 *
 * **No invented links.** A real operator's footer carries Impressum,
 * Datenschutz, Barrierefreiheit and a dozen more. Reproducing that shape with
 * links to pages this project does not have would be the footer equivalent of
 * a mock that renders as real data — it looks like a finished product and
 * every second link is a 404. So the columns hold what actually exists: the
 * three sections, the source, and the legal basis as prose.
 *
 * **The legal basis is text, not links.** The statutes are cited by SR number
 * — the citation IS the reference, and a Swiss reader can find SR 745.11 from
 * the number alone. Fedlex renders its acts client-side, so the ELI permalinks
 * could not be verified from here, and a legal citation that links to the
 * wrong act is worse than one that links to nothing.
 *
 * The disclaimer sits here as well as in `ConceptNotice`, because a reader who
 * lands mid-site from a shared link never sees the app shell, and a build
 * carrying someone else's trademark has to say so wherever a person can stop
 * reading.
 */
export function SiteFooter({ locale }: { locale: Locale }) {
  const t = translator(locale);

  return (
    <footer className="site-rule mt-auto bg-app-milk">
      <div className="site-width grid gap-app-xl py-app-2xl md:grid-cols-3">
        <section>
          <h2 className="text-app-sm font-bold text-app-charcoal">{t('site.footer.product')}</h2>
          <ul className="mt-app-md space-y-app-sm text-app-sm">
            {SECTIONS.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="text-app-granite hover:text-app-charcoal">
                  {t(s.key)}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-app-sm font-bold text-app-charcoal">{t('site.footer.legal')}</h2>
          <p className="mt-app-md text-app-xs text-app-granite">{t('site.footer.legalBasis')}</p>
          <p className="mt-app-sm text-app-xs text-app-granite">{t('site.footer.retention')}</p>
        </section>

        <section>
          <h2 className="text-app-sm font-bold text-app-charcoal">{t('site.footer.project')}</h2>
          <ul className="mt-app-md space-y-app-sm text-app-sm">
            <li>
              <a
                href={REPO_URL}
                rel="noreferrer"
                className="text-app-granite hover:text-app-charcoal"
              >
                {t('site.footer.code')}
              </a>
            </li>
          </ul>
          <p className="mt-app-md text-app-xs text-app-granite">
            {tenant.isConcept ? (
              <>
                <strong className="font-semibold text-app-charcoal">
                  {t('site.footer.concept')}
                </strong>{' '}
                {/* "von <Name>" avoids declining a name that is a free string. */}
                Kein offizielles Produkt von {tenant.wordmark}.
              </>
            ) : (
              t('site.footer.concept')
            )}
          </p>
        </section>
      </div>

      <div className="site-rule">
        <div className="site-width flex flex-wrap items-center justify-between gap-app-md py-app-lg">
          <p className="text-app-xs text-app-granite">{t('site.footer.language')}</p>
          <LanguageSwitcher current={locale} className="text-app-xs" />
        </div>
      </div>
    </footer>
  );
}
