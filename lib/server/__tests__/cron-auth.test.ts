import { authoriseCron } from '../auth';

const SECRET = 'a-sufficiently-long-cron-secret';

function req(headers: Record<string, string> = {}): Request {
  return new Request('https://example.invalid/api/cron/purge', { method: 'POST', headers });
}

describe('cron authorisation fails closed', () => {
  const original = process.env.CRON_SECRET;
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it('refuses everything when no secret is configured', () => {
    delete process.env.CRON_SECRET;
    const result = authoriseCron(req({ authorization: `Bearer ${SECRET}` }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });

  it('refuses a secret short enough to guess', () => {
    process.env.CRON_SECRET = 'short';
    const result = authoriseCron(req({ authorization: 'Bearer short' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });
});

describe('cron authorisation with a secret configured', () => {
  const original = process.env.CRON_SECRET;
  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it('rejects a request with no credential', () => {
    const result = authoriseCron(req());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it('rejects the wrong secret', () => {
    const result = authoriseCron(req({ authorization: 'Bearer not-the-secret-at-all-no' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it('rejects a prefix of the real secret', () => {
    const result = authoriseCron(req({ authorization: `Bearer ${SECRET.slice(0, -1)}` }));
    expect(result.ok).toBe(false);
  });

  it('accepts the bearer form the box runner sends', () => {
    const result = authoriseCron(req({ authorization: `Bearer ${SECRET}` }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.actor).toBe('scheduled job');
  });

  it('does NOT accept the staff header, cookie or query forms', () => {
    // A cron has no browser. Every extra way in is a way in to defend.
    expect(authoriseCron(req({ 'x-staff-token': SECRET })).ok).toBe(false);
    expect(authoriseCron(req({ cookie: `staff_token=${SECRET}` })).ok).toBe(false);
    const withQuery = new Request(`https://example.invalid/api/cron/purge?token=${SECRET}`, {
      method: 'POST',
    });
    expect(authoriseCron(withQuery).ok).toBe(false);
  });

  it('does not accept the STAFF token as a cron secret', () => {
    // Two secrets, two audiences. A leaked crew token must not be able to
    // trigger deletions.
    const originalStaff = process.env.STAFF_ACCESS_TOKEN;
    process.env.STAFF_ACCESS_TOKEN = 'a-sufficiently-long-staff-token';
    const result = authoriseCron(req({ authorization: 'Bearer a-sufficiently-long-staff-token' }));
    expect(result.ok).toBe(false);
    if (originalStaff === undefined) delete process.env.STAFF_ACCESS_TOKEN;
    else process.env.STAFF_ACCESS_TOKEN = originalStaff;
  });
});
