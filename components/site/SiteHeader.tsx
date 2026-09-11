'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useT } from '@/lib/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n';

/**
 * Client, only because of `aria-current`.
 *
 * Marking the current page is not decoration: for a screen-reader user it is
 * the only signal of where they are in the site, and it cannot be derived on
 * the server without making the whole layout dynamic per path. The underline
 * in globals.css keys off the same attribute, so the visual state and the
 * announced state can never disagree.
 *
 * WHY THE WORDMARK IS A PROP AND NOT AN IMPORT
 *
 * This component read `tenant.wordmark` from `lib/tenant.ts` directly, and it
 * rendered the neutral house wordmark on a build whose every other surface —
 * page title, footer, palette — named the livery tenant.
 *
 * `lib/tenant.ts` resolves from `NEXT_PUBLIC_TENANT`, and that variable has
 * two different origins depending on where it is read. Next inlines it into
 * the CLIENT bundle at build time; a server component reads it from the
 * process at request time. Build without it and set it at runtime — which is
 * exactly what a deploy that configures the unit rather than the build does —
 * and the server renders one operator while the hydrated client renders
 * another. The page title said one thing and the logo said the other.
 *
 * So the tenant is resolved once, on the server, and handed down. A client
 * component cannot disagree with a value it is given.
 * `lib/__tests__/tenant-client-boundary.test.ts` keeps it that way.
 */
const LINKS: ReadonlyArray<{ href: string; key: MessageKey }> = [
  { href: '/how-it-works', key: 'site.nav.how' },
  { href: '/research', key: 'site.nav.research' },
];

export function SiteHeader({ wordmark }: { wordmark: string }) {
  const t = useT();
  const pathname = usePathname();

  return (
    <header className="site-header">
      {/* Wraps on purpose. At 390px the wordmark, two nav links and the action
          do not fit on one line: the nav shredded into three lines and the
          action was pushed off the right edge of the viewport. On small
          screens the nav drops to its own full-width row below (`order-last`,
          `w-full`); from `sm` up it returns to the single row. One markup, no
          duplicated nav, no JavaScript. */}
      <div className="site-width flex flex-wrap items-center justify-between gap-x-app-md gap-y-app-sm py-app-sm sm:h-16 sm:flex-nowrap sm:py-0">
        <Link href="/" className="flex shrink-0 items-baseline gap-2">
          <span className="text-app-lg font-bold tracking-tight text-brand">{wordmark}</span>
          <span className="hidden text-app-sm text-app-granite sm:inline">Fundbüro</span>
        </Link>

        <nav
          aria-label={t('site.nav.home')}
          className="order-last flex w-full items-center gap-app-lg text-app-sm sm:order-none sm:w-auto"
        >
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
        </nav>

        <Link
          href="/app"
          className="shrink-0 rounded-app-md bg-brand px-app-md py-2 text-app-sm font-semibold text-brand-contrast hover:bg-brand-hover"
        >
          {t('site.nav.app')}
        </Link>
      </div>
    </header>
  );
}
