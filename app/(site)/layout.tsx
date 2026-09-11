import { headers } from 'next/headers';

import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { localeFromAcceptLanguage } from '@/lib/i18n';

/**
 * The website.
 *
 * Full width, its own header and footer, no phone frame. The app's `(app)`
 * group keeps the 430px container; nothing is shared between the two shells
 * except the tokens, which is the point — one palette, two surfaces.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const locale = localeFromAcceptLanguage((await headers()).get('accept-language'));

  return (
    <div className="site-shell">
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
