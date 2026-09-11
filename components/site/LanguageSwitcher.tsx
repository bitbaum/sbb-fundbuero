'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { LOCALES, LOCALE_NAMES, type Locale } from '@/lib/i18n';

/**
 * Four languages, reachable.
 *
 * The app has had four full catalogues for a long time and no way for a
 * visitor to reach three of them: the locale came from `Accept-Language` and
 * nothing else, so a French speaker on a German-configured browser read German
 * and had no recourse. Switzerland is quadrilingual; shipping the translations
 * and hiding the switch is worse than not translating at all, because it looks
 * deliberate.
 *
 * Plain anchors to a server route, not a client-side store. `usePathname`
 * renders into the server HTML too, so the links are correct and clickable
 * before any JavaScript arrives — which matters most for the person who cannot
 * read the page they are on.
 *
 * Order is `LOCALES`: de, fr, it, en. Official-language order first, English
 * last, as every Swiss federal surface does it.
 *
 * `aria-current="true"`, not `"page"`: the active language is not a different
 * page, and screen readers announce "current page" for `page`, which would be
 * a lie about where the reader is.
 */
export function LanguageSwitcher({
  current,
  className = '',
}: {
  current: Locale;
  className?: string;
}) {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  // Round-trip the querystring, so switching language on a filtered or
  // deep-linked view does not silently drop the reader back to a bare page.
  const next = `${pathname}${search ? `?${search}` : ''}`;

  return (
    <nav aria-label="Sprache / Langue / Lingua / Language" className={className}>
      <ul className="flex items-center gap-app-xs">
        {LOCALES.map((locale) => {
          const active = locale === current;
          return (
            <li key={locale}>
              <a
                href={`/api/locale?to=${locale}&next=${encodeURIComponent(next)}`}
                hrefLang={locale}
                aria-current={active ? 'true' : undefined}
                className={
                  active
                    ? 'rounded-app-sm px-2 py-1 font-semibold text-app-charcoal underline underline-offset-4'
                    : 'rounded-app-sm px-2 py-1 text-app-granite hover:bg-app-milk hover:text-app-charcoal'
                }
              >
                {/* Endonym in full: "Français", not "FR". A two-letter code is
                    the one thing a person who cannot read this page still has
                    to decode. */}
                {LOCALE_NAMES[locale]}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
