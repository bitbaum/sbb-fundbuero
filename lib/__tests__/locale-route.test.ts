/**
 * The language switcher's redirect, tested behind a proxy.
 *
 * WHAT WENT WRONG IN PRODUCTION
 *
 * The route built its `Location` with `new URL(destination, url.origin)`.
 * Locally that is right, because the origin you request IS the origin the
 * process serves on. In production the app is bound to 127.0.0.1:4016 behind
 * Caddy, so `url.origin` is `https://localhost:4016` — and every language
 * switch sent the visitor to a port on their own machine.
 *
 * Nothing could have caught that before deploy except looking at the deployed
 * thing: CI was green, the unit tests passed, and a local run produces the
 * correct absolute URL for the wrong reason.
 *
 * So the assertion is about the SHAPE of the header, not its value: it must be
 * a relative reference, which the browser resolves against the URL it actually
 * asked for — which is the public one, by definition. RFC 7231 has permitted
 * that since 2014.
 */
import { GET } from '../../app/api/locale/route';
import { LOCALE_COOKIE } from '../i18n/server';

/** A request as it arrives at the app behind the reverse proxy. */
const behindProxy = (query: string) => new Request(`http://localhost:4016/api/locale?${query}`);

describe('switching language', () => {
  it('never emits the internal origin in Location', () => {
    // The regression, stated directly.
    const location = GET(behindProxy('to=fr&next=%2Fresearch')).headers.get('location');
    expect(location).not.toMatch(/localhost/);
    expect(location).not.toMatch(/4016/);
  });

  it('emits a relative reference the browser resolves against the public URL', () => {
    const response = GET(behindProxy('to=fr&next=%2Fresearch'));
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/research');
  });

  it('sets the chosen locale as a cookie', () => {
    const cookie = GET(behindProxy('to=it&next=%2F')).headers.get('set-cookie') ?? '';
    expect(cookie).toContain(`${LOCALE_COOKIE}=it`);
    expect(cookie).toContain('Path=/');
    // A language preference outlives the tab; a session cookie would make the
    // switcher look broken on the next visit.
    expect(cookie).toMatch(/Max-Age=\d{6,}/);
  });

  it('falls back rather than erroring on an unknown locale', () => {
    // This endpoint sits behind a link someone clicked. An error page because
    // a query string was stale helps nobody.
    const cookie = GET(behindProxy('to=klingon&next=%2F')).headers.get('set-cookie') ?? '';
    expect(cookie).toContain(`${LOCALE_COOKIE}=de`);
  });

  it('refuses to redirect off-site', () => {
    // `//evil.example` is protocol-relative and starts with a slash, which is
    // why "starts with a slash" is not the check.
    for (const hostile of [
      '%2F%2Fevil.example',
      'https%3A%2F%2Fevil.example',
      '%2F%5Cevil.example',
    ]) {
      const location = GET(behindProxy(`to=fr&next=${hostile}`)).headers.get('location');
      expect(location).toBe('/');
    }
  });

  it('redirects to the root when no destination is given', () => {
    expect(GET(behindProxy('to=en')).headers.get('location')).toBe('/');
  });
});
