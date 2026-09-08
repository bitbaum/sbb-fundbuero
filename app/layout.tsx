import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { AppProvider } from '@/components/providers/AppProvider';
import { ConceptNotice } from '@/components/ui/ConceptNotice';
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
  maximumScale: 1,
  userScalable: false,
  themeColor: tenant.themeColor,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-tenant is the single switch: globals.css keys every operator
    // override off it, so the whole palette changes from this one attribute.
    <html lang={tenant.locale} data-tenant={tenant.id}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AppProvider>
          <div className="mobile-container">
            <ConceptNotice />
            {children}
          </div>
        </AppProvider>

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
