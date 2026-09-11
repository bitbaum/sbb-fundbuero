import { NextResponse } from 'next/server';

import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n';
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isSafeNextPath } from '@/lib/i18n/server';

/**
 * Switch language.
 *
 * A GET route handler behind a plain `<a href>`, not a client-side toggle.
 * Three reasons, in order of how much they matter:
 *
 *   1. It works with JavaScript off, and it works before hydration. A language
 *      switcher that needs the bundle to load is broken for exactly the person
 *      most likely to need it — someone who cannot read the page they are
 *      looking at and wants out of it immediately.
 *   2. The choice has to outlive the tab, so it is a cookie, and a cookie set
 *      by the server is one round trip rather than a hydration-then-write.
 *   3. Every link is crawlable and bookmarkable.
 *
 * 303, not 301: a permanent redirect would be cached by the browser, and the
 * next visit to `?to=fr` would never reach the server that sets the cookie.
 * 303 also guarantees the follow-up is a GET regardless of how we got here.
 */
export function GET(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get('to');
  const next = url.searchParams.get('next');

  // An unknown locale falls back rather than 400s. This endpoint sits behind a
  // link a person clicked; answering an error page because a query string was
  // stale helps nobody, and the reference locale is always readable.
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;

  // `next` is attacker-controllable, so it is validated rather than trusted —
  // see isSafeNextPath. Anything that fails the check goes to the root.
  const destination = isSafeNextPath(next) ? next : '/';

  // RELATIVE Location, and this is not a style choice.
  //
  // `NextResponse.redirect` demands an absolute URL, and the only origin this
  // process knows is its own: behind the reverse proxy the app is bound to
  // 127.0.0.1:4016, so `url.origin` is `https://localhost:4016` and every
  // language switch sent the visitor to a port on their own machine. It looked
  // perfect in local testing, where the origin happens to be the real one.
  //
  // Trusting `x-forwarded-host` instead would work and would also mean echoing
  // an attacker-suppliable header into a Location. RFC 7231 has allowed a
  // relative reference in Location since 2014 and every browser resolves it
  // against the requested URL — which is the public one, by definition.
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: destination },
  });

  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: 'lax',
    // Not `httpOnly`: this is a display preference, and a client component may
    // legitimately want to read it. Not `secure` unconditionally either — that
    // would silently drop the cookie on a plain-HTTP local build and make the
    // switcher look broken in development for no gain.
    secure: url.protocol === 'https:',
  });

  return response;
}
