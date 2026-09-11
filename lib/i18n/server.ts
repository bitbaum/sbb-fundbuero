import { cookies, headers } from 'next/headers';

import { DEFAULT_LOCALE, isLocale, localeFromAcceptLanguage, type Locale } from './index';

/**
 * The cookie that remembers a deliberate choice.
 *
 * Name is short and unprefixed because it is not a secret and not an auth
 * artefact — it is a preference, and it must survive being read by a route
 * handler, a layout and a page in the same request.
 */
export const LOCALE_COOKIE = 'locale';

/** A year. A language preference is not a session. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Which language to render in.
 *
 * Order matters and is the whole point: an explicit choice beats a browser
 * header, always. `Accept-Language` is a decent first guess and a terrible
 * final answer — a person on a borrowed machine, or a French speaker whose
 * browser was installed in German, has no way to correct it if the header
 * always wins. That was the state before the switcher existed: four
 * catalogues, and no way for a visitor to reach three of them.
 */
export async function resolveLocale(): Promise<Locale> {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;

  return localeFromAcceptLanguage((await headers()).get('accept-language')) ?? DEFAULT_LOCALE;
}

/**
 * Is this a path we may redirect back to after switching?
 *
 * A `next` parameter that is echoed into a `Location` header is an open
 * redirect unless it is checked, and "starts with a slash" is not the check —
 * `//evil.example` and `/\evil.example` are both protocol-relative and both
 * start with a slash. Accept a single leading slash followed by something that
 * is not a slash or a backslash, and nothing else.
 */
export function isSafeNextPath(value: string | null): value is string {
  return typeof value === 'string' && /^\/(?![/\\])[^\s]*$/.test(value);
}
