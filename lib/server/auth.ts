/**
 * Server-side authorisation for staff actions.
 *
 * `/staff` previously had none at all — no session, no login, no guard. It
 * rendered passenger reports to anyone who knew the URL.
 *
 * What this is: a single shared staff secret, checked server-side on every
 * staff route. What it is NOT: real authentication. There are no accounts, no
 * per-person identity, and therefore no way to know WHICH member of staff
 * resolved a claim beyond what they type. `TODO.md` carries that as a launch
 * blocker; this closes the open door in the meantime without pretending to be
 * more than it is.
 *
 * It FAILS CLOSED. With STAFF_ACCESS_TOKEN unset, every staff route refuses.
 * The tempting alternative — "no token configured, so allow everything" —
 * turns a forgotten environment variable into an open backend, which is
 * exactly how the current version came to have no protection at all.
 */

import { timingSafeEqual } from 'node:crypto';

export type AuthResult =
  { ok: true; actor: string } | { ok: false; status: 401 | 503; reason: string };

const HEADER = 'x-staff-token';
const COOKIE = 'staff_token';

export function authoriseStaff(request: Request): AuthResult {
  const expected = process.env.STAFF_ACCESS_TOKEN;

  if (!expected || expected.length < 16) {
    // 503, not 401: the caller did nothing wrong and retrying with a different
    // token will not help. The deployment is misconfigured.
    return {
      ok: false,
      status: 503,
      reason:
        'Staff access is not configured on this deployment. ' +
        'Set STAFF_ACCESS_TOKEN (at least 16 characters).',
    };
  }

  const presented = presentedToken(request);
  if (!presented || !constantTimeEqual(presented, expected)) {
    return { ok: false, status: 401, reason: 'Staff token missing or incorrect.' };
  }

  // Free-text, because there are no accounts. Recorded on anything the actor
  // does, so an audit row says "someone who called themselves X" rather than
  // nothing at all.
  const actor = request.headers.get('x-staff-actor')?.trim();
  return { ok: true, actor: actor && actor.length > 0 ? actor.slice(0, 120) : 'unnamed staff' };
}

function presentedToken(request: Request): string | null {
  const header = request.headers.get(HEADER);
  if (header) return header.trim();

  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7).trim();

  // Cookie, so the staff page can be used in a browser without a devtools
  // detour. Parsed by hand rather than pulling in a dependency for one line.
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;

  for (const part of cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE) return decodeURIComponent(rest.join('='));
  }

  return null;
}

/**
 * Compare without leaking the answer through timing.
 *
 * `a === b` on secrets returns as soon as two bytes differ, which tells an
 * attacker how much of a guess was right. Lengths are compared first because
 * timingSafeEqual throws on a mismatch — that leaks the length, which is not
 * worth defending here and is not what the comparison protects.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
