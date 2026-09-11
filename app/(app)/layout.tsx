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
 *
 * It sits at the TOP, above `<main>`, because the report flow ends in a sticky
 * action bar. Placed after the flow it rendered in the gap between the form and
 * that bar — reading as a stray link inside the form rather than as a way out
 * of it.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const locale = localeFromAcceptLanguage((await headers()).get('accept-language'));
  const t = translator(locale);

  return (
    <div className="mobile-container">
      <ConceptNotice />
      <p className="border-b border-app-cloud px-app-md py-app-sm text-app-xs text-app-granite">
        <Link href="/" className="hover:text-app-charcoal">
          {/* aria-hidden: the arrow is decoration, and a screen reader
              announcing "left arrow Start" is worse than "Start". */}
          <span aria-hidden="true">← </span>
          {t('site.nav.home')}
        </Link>
      </p>
      <main id="main">{children}</main>
    </div>
  );
}
