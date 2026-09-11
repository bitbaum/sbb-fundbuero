import { translator, type Locale } from '@/lib/i18n';
import { tenant } from '@/lib/tenant';

/** Where the claims on this site can be checked. */
const REPO_URL = 'https://github.com/bitbaum/sbb-fundbuero';

/**
 * The disclaimer is the footer's reason to exist.
 *
 * `ConceptNotice` states it once at the top of the app; this states it at the
 * bottom of every website page, because a reader who lands mid-site from a
 * shared link never sees the app shell. A build carrying someone else's
 * trademark has to say so wherever a person can stop reading.
 */
export function SiteFooter({ locale }: { locale: Locale }) {
  const t = translator(locale);

  return (
    <footer className="site-rule mt-auto bg-app-milk py-app-2xl">
      <div className="site-width flex flex-col gap-app-sm text-app-sm text-app-granite sm:flex-row sm:items-center sm:justify-between">
        <p>
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
        <a
          href={REPO_URL}
          className="underline underline-offset-2 hover:text-app-charcoal"
          rel="noreferrer"
        >
          {t('site.footer.code')}
        </a>
      </div>
    </footer>
  );
}
