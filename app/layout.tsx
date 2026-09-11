import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { resolveLocale } from '@/lib/i18n/server';
import { translate } from '@/lib/i18n';
import { tenant } from '@/lib/tenant';
import './globals.css';

/**
 * Where this site actually serves. Load-bearing for the social preview: Next
 * resolves the generated og:image against `metadataBase`, and without it the
 * tag is emitted as http://localhost:3000/opengraph-image — present, plausible,
 * and unfetchable by every scraper. Falls back to the real host, not localhost.
 */
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sbbfundbuero.orangecat.ch';

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
  const locale = await resolveLocale();

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
          {translate(locale, 'site.skipToContent')}
        </a>

        {/* The shell below this point belongs to the route group: the website
            renders full-width in `(site)`, the phone renders 430px wide in
            `(app)`. Both own their own <main id="main">, which is what the
            skip link above targets. Putting one container here would have
            forced the website into the app's phone frame. */}
        <LocaleProvider locale={locale}>{children}</LocaleProvider>

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
