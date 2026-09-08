import { authoriseStaff } from '../auth';

const TOKEN = 'a-sufficiently-long-staff-token';

function req(headers: Record<string, string> = {}): Request {
  return new Request('https://example.invalid/api/reports', { headers });
}

describe('staff authorisation fails closed', () => {
  const original = process.env.STAFF_ACCESS_TOKEN;
  afterEach(() => {
    if (original === undefined) delete process.env.STAFF_ACCESS_TOKEN;
    else process.env.STAFF_ACCESS_TOKEN = original;
  });

  it('refuses everything when no token is configured', () => {
    // The tempting alternative — "nothing configured, so allow everything" —
    // turns a forgotten environment variable into an open backend. That is
    // exactly how /staff came to have no protection at all.
    delete process.env.STAFF_ACCESS_TOKEN;

    const result = authoriseStaff(req({ 'x-staff-token': TOKEN }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });

  it('refuses a token short enough to guess', () => {
    process.env.STAFF_ACCESS_TOKEN = 'short';

    const result = authoriseStaff(req({ 'x-staff-token': 'short' }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });

  it('answers 503 rather than 401 for a misconfigured deployment', () => {
    // The caller did nothing wrong and retrying with a different token will
    // not help. Saying 401 would send them hunting for a credential that does
    // not exist.
    delete process.env.STAFF_ACCESS_TOKEN;

    const result = authoriseStaff(req());
    if (!result.ok) expect(result.reason).toMatch(/not configured/i);
  });
});

describe('staff authorisation with a token configured', () => {
  const original = process.env.STAFF_ACCESS_TOKEN;
  beforeEach(() => {
    process.env.STAFF_ACCESS_TOKEN = TOKEN;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.STAFF_ACCESS_TOKEN;
    else process.env.STAFF_ACCESS_TOKEN = original;
  });

  it('rejects a request with no credential at all', () => {
    const result = authoriseStaff(req());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it('rejects the wrong token', () => {
    const result = authoriseStaff(req({ 'x-staff-token': 'not-the-right-token-at-all' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it('rejects a token of a different length without throwing', () => {
    // timingSafeEqual throws on a length mismatch; a comparison that crashes
    // on a wrong guess is a denial of service with extra steps.
    expect(() => authoriseStaff(req({ 'x-staff-token': 'x' }))).not.toThrow();
    expect(authoriseStaff(req({ 'x-staff-token': 'x' })).ok).toBe(false);
  });

  it('rejects a prefix of the real token', () => {
    expect(authoriseStaff(req({ 'x-staff-token': TOKEN.slice(0, -1) })).ok).toBe(false);
  });

  it('accepts the header form', () => {
    expect(authoriseStaff(req({ 'x-staff-token': TOKEN })).ok).toBe(true);
  });

  it('accepts the bearer form', () => {
    expect(authoriseStaff(req({ authorization: `Bearer ${TOKEN}` })).ok).toBe(true);
  });

  it('accepts the cookie form, so the page works in a browser', () => {
    expect(authoriseStaff(req({ cookie: `staff_token=${TOKEN}` })).ok).toBe(true);
  });

  it('finds its cookie among others', () => {
    expect(authoriseStaff(req({ cookie: `theme=dark; staff_token=${TOKEN}; other=1` })).ok).toBe(
      true,
    );
  });

  it('records an actor name when one is given', () => {
    const result = authoriseStaff(req({ 'x-staff-token': TOKEN, 'x-staff-actor': 'Crew 42' }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.actor).toBe('Crew 42');
  });

  it('records SOMETHING when no actor name is given', () => {
    // An audit row saying "someone who called themselves nothing" is still
    // better than a null that reads as "nobody did this".
    const result = authoriseStaff(req({ 'x-staff-token': TOKEN }));
    if (result.ok) expect(result.actor).toBe('unnamed staff');
  });

  it('bounds the actor name a caller can inject', () => {
    const result = authoriseStaff(
      req({ 'x-staff-token': TOKEN, 'x-staff-actor': 'z'.repeat(5000) }),
    );
    if (result.ok) expect(result.actor.length).toBeLessThanOrEqual(120);
  });
});
