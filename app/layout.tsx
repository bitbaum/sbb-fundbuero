import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import Script from 'next/script';

import { ConceptNotice } from '@/components/ui/ConceptNotice';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { localeFromAcceptLanguage, translate } from '@/lib/i18n';
import { tenant } from '@/lib/tenant';
import './globals.css';

/**
 * Where this site actually serves. Load-bearing for the social preview: Next
 * resolves the generated og:image against `metadataBase`, and without it the
 * tag is emitted as http://localhost:3000/opengraph-image — present, plausible,
 * and unfetchable by every scraper. Falls back to the real host, not localhost.
 */
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://nordbahn.orangecat.ch';

// Every operator-facing string comes from the tenant SSOT (lib/tenant.ts).
// Nothing here names an operator.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: tenant.productName,
  description: tenant.description,
  openGraph: {
    title: tenant.productName,
    description: tenant.description,
    url: SITE_URL,
    siteName: tenant.productName,
    type: 'website',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: tenant.productName,
  },
  // A build carrying someone else's trademark is a pitch artefact and must not
  // be indexed — being findable is what turns a demo into impersonation.
  robots: tenant.isConcept ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // NO maximumScale and NO userScalable:false.
  //
  // Those two were here, and they are a WCAG 2.2 failure (1.4.4 Resize Text):
  // they stop a person pinch-zooming the form. On a phone, on a moving train,
  // for someone who may not see well — in a domain covered by the BehiG — that
  // is not a styling preference, it is locking people out. iOS has not needed
  // the input-zoom workaround since text inputs are 16px, which ours are.
  themeColor: tenant.themeColor,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The locale the visitor asked for, not the one the operator prefers.
  // `de-CH` resolves to `de`; anything we do not have falls back.
  const locale = localeFromAcceptLanguage((await headers()).get('accept-language'));

  return (
    // data-tenant is the single switch: globals.css keys every operator
    // override off it, so the whole palette changes from this one attribute.
    <html lang={locale} data-tenant={tenant.id}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {/* First thing in the tab order, visible only when focused. Four steps
            of form is a long way to travel with a keyboard otherwise. */}
        <a href="#main" className="skip-link">
          {translate(locale, 'app.skipToContent')}
        </a>

        <LocaleProvider locale={locale}>
          <div className="mobile-container">
            <ConceptNotice />
            <main id="main">{children}</main>
          </div>
        </LocaleProvider>

        {/* FleetCrown feedback widget — env-gated, see docs/architecture/feedback-widget.md */}
        {process.env.NEXT_PUBLIC_FC_WIDGET_TOKEN && (
          <Script
            src="https://fleetcrown.orangecat.ch/widget.js"
            strategy="afterInteractive"
            data-fc-project={process.env.NEXT_PUBLIC_FC_WIDGET_TOKEN}
          />
        )}
      </body>
    </html>
  );
}
