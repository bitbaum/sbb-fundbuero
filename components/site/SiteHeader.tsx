'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LanguageSwitcher } from '@/components/site/LanguageSwitcher';
import { useT } from '@/lib/i18n/LocaleProvider';
import type { Locale, MessageKey } from '@/lib/i18n';

/**
 * The site chrome.
 *
 * The shape is the one Swiss transport and federal sites converge on: white
 * ground with a hairline rule, wordmark hard left, section links beside it,
 * and the service controls — language, then the primary action — hard right.
 *
 * No coloured header bar, deliberately. The brand colour is spent on the
 * primary action and almost nothing else, which is what makes these pages read
 * as calm; flooding it across a full-width bar is the usual way an attempt at
 * this look ends up looking like a budget airline. It is also why the layout
 * survives a tenant swap — the neutral house brand renders the same chrome in
 * blue and looks correct doing it.
 *
 * Provenance for the tokens and metrics: docs/design-language.md.
 *
 * Client, for two reasons that both need the current URL: `aria-current` on
 * the active section, and the language switcher's return path. Both render
 * into the server HTML, so the header is complete and usable before hydration.
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
 * another.
 *
 * So the tenant is resolved once, on the server, and handed down. A client
 * component cannot disagree with a value it is given.
 * `lib/__tests__/tenant-client-boundary.test.ts` keeps it that way.
 */
const LINKS: ReadonlyArray<{ href: string; key: MessageKey }> = [
  { href: '/how-it-works', key: 'site.nav.how' },
  { href: '/research', key: 'site.nav.research' },
];

export function SiteHeader({ wordmark, locale }: { wordmark: string; locale: Locale }) {
  const t = useT();
  const pathname = usePathname();

  return (
    <header className="site-header">
      {/* Wraps on purpose, and the `order-*` classes are the whole trick.
          At 390px the wordmark, two sections, four language links and the
          action cannot share a line. Rather than hide something — the first
          casualty is always the language switcher, which is what made four
          full catalogues invisible on a phone — the header reflows into three
          rows:

            [wordmark ............ action]
            [sections]
            [languages]

          From `md` up the same four children reorder into the single row this
          kind of site uses: wordmark, sections, then languages and the action
          pushed right. One instance of each child, so a screen reader does not
          meet the same nav landmark twice. */}
      <div className="site-width flex flex-wrap items-center gap-x-app-lg gap-y-app-sm py-app-sm md:h-[72px] md:flex-nowrap md:py-0">
        <Link href="/" className="order-1 flex shrink-0 items-baseline gap-2">
          {/* The wordmark is the tenant's, never a literal. */}
          <span className="text-app-xl font-bold tracking-tight text-brand">{wordmark}</span>
          <span className="text-app-base text-app-granite">{t('site.footer.product')}</span>
        </Link>

        <Link
          href="/app"
          className="order-2 ms-auto shrink-0 rounded-app-md bg-brand px-app-md py-2 text-app-sm font-semibold text-brand-contrast hover:bg-brand-hover active:bg-brand-active md:order-4 md:ms-0"
        >
          {t('site.nav.app')}
        </Link>

        <nav
          aria-label={t('site.nav.home')}
          className="order-3 flex w-full items-center gap-app-lg text-app-sm md:order-2 md:w-auto"
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

        <LanguageSwitcher
          current={locale}
          className="order-4 w-full text-app-xs md:order-3 md:ms-auto md:w-auto"
        />
      </div>
    </header>
  );
}
