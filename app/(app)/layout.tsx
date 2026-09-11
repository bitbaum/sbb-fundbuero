import Link from 'next/link';
import { headers } from 'next/headers';

import { ConceptNotice } from '@/components/ui/ConceptNotice';
import { localeFromAcceptLanguage, translator } from '@/lib/i18n';

/**
 * The phone.
 *
 * Everything in this group — the passenger report flow and the crew board — is
 * designed for one hand on a moving train, so it keeps the 430px frame. The
 * website around it is a different surface for a different reader and lives in
 * `(site)`.
 *
 * The one link back out matters more than it looks: a person who arrives at
 * `/app` from a shared link has no other route to the explanation of what they
 * are looking at, and an unexplained pitch build carrying an operator's mark is
 * the failure mode `ConceptNotice` exists to prevent.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const locale = localeFromAcceptLanguage((await headers()).get('accept-language'));
  const t = translator(locale);

  return (
    <div className="mobile-container">
      <ConceptNotice />
      <main id="main">{children}</main>
      <p className="text-center text-app-xs text-app-granite py-app-md border-t border-app-cloud">
        <Link href="/" className="underline underline-offset-2 hover:text-app-charcoal">
          {t('site.nav.home')}
        </Link>
      </p>
    </div>
  );
}
