import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { ConceptNotice } from '@/components/ui/ConceptNotice';
import { resolveLocale } from '@/lib/i18n/server';
import { tenant } from '@/lib/tenant';

/**
 * The passenger app, inside the site.
 *
 * It used to render in a 430px `.mobile-container` at every width — a phone
 * frame with a drop shadow, floating in the middle of a laptop window, with a
 * white action bar welded across the bottom of the viewport. On a phone that
 * is exactly right. On a desktop it is a phone screenshot pretending to be a
 * web page, and it tells a visitor who just arrived from the landing page that
 * the product is a mock-up.
 *
 * So the app wears the site's own header and footer now, and the flow becomes
 * a form on a page above `md` (see `.app-canvas` and the action bar in
 * ReportFlow). Below `md` nothing changes: same 430px column, same thumb-arc
 * bar, because that is the situation the flow was designed for and still the
 * situation most reports will be filed in.
 *
 * The crew board is NOT here — it moved to `(crew)`, which keeps the phone
 * frame and none of this chrome. Crew walking through a carriage do not need a
 * language switcher and a legal footer.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const locale = await resolveLocale();

  return (
    <div className="site-shell">
      <ConceptNotice />
      <SiteHeader wordmark={tenant.wordmark} locale={locale} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
