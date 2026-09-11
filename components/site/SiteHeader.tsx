'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useT } from '@/lib/i18n/LocaleProvider';
import { tenant } from '@/lib/tenant';
import type { MessageKey } from '@/lib/i18n';

/**
 * Client, only because of `aria-current`.
 *
 * Marking the current page is not decoration: for a screen-reader user it is
 * the only signal of where they are in the site, and it cannot be derived on
 * the server without making the whole layout dynamic per path. The underline
 * in globals.css keys off the same attribute, so the visual state and the
 * announced state can never disagree.
 */
const LINKS: ReadonlyArray<{ href: string; key: MessageKey }> = [
  { href: '/how-it-works', key: 'site.nav.how' },
  { href: '/research', key: 'site.nav.research' },
];

export function SiteHeader() {
  const t = useT();
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="site-width flex h-16 items-center justify-between gap-app-md">
        <Link href="/" className="flex shrink-0 items-baseline gap-2">
          {/* The wordmark is the tenant's, never a literal. */}
          <span className="text-app-lg font-bold tracking-tight text-brand">{tenant.wordmark}</span>
          <span className="hidden text-app-sm text-app-granite sm:inline">Fundbüro</span>
        </Link>

        <nav aria-label={t('site.nav.home')} className="flex items-center gap-app-lg text-app-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="site-navlink"
              aria-current={pathname === l.href ? 'page' : undefined}
            >
              {t(l.key)}
            </Link>
          ))}
          <Link
            href="/app"
            className="rounded-app-md bg-brand px-app-md py-2 font-semibold text-brand-contrast hover:bg-brand-hover"
          >
            {t('site.nav.app')}
          </Link>
        </nav>
      </div>
    </header>
  );
}
