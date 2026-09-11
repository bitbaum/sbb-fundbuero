import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';

import { tenant } from '@/lib/tenant';
import { resolveLocale } from '@/lib/i18n/server';

/**
 * The website.
 *
 * Full width, its own header and footer, no phone frame. The app's `(app)`
 * group keeps the 430px container; nothing is shared between the two shells
 * except the tokens, which is the point — one palette, two surfaces.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const locale = await resolveLocale();

  return (
    <div className="site-shell">
      {/* Resolved here, on the server, and handed down. A client component
          reading NEXT_PUBLIC_TENANT gets the value inlined at BUILD time,
          which is a different answer from the server's runtime read — see
          the note in SiteHeader. */}
      <SiteHeader wordmark={tenant.wordmark} locale={locale} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
