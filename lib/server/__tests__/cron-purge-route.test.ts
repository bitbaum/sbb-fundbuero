/**
 * The purge route is thin on purpose — guard, call, report — so what is worth
 * proving is the contract the box's timer relies on: a bad secret never
 * reaches the purge, a good one does exactly once, and a failing purge
 * surfaces as a non-2xx so the unit fails and the OnFailure alert fires.
 */

import { POST } from '@/app/api/cron/purge/route';
import { purgeExpired } from '@/lib/server/purge';

jest.mock('@/lib/server/purge', () => ({
  purgeExpired: jest.fn(),
}));

const mockedPurge = purgeExpired as jest.MockedFunction<typeof purgeExpired>;
const SECRET = 'a-sufficiently-long-cron-secret';

function post(headers: Record<string, string> = {}): Request {
  return new Request('https://example.invalid/api/cron/purge', { method: 'POST', headers });
}

describe('POST /api/cron/purge', () => {
  const original = process.env.CRON_SECRET;
  let log: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
    mockedPurge.mockReset();
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
    log.mockRestore();
    error.mockRestore();
  });

  it('never reaches the purge without the secret', async () => {
    const response = await POST(post());
    expect(response.status).toBe(401);
    expect(mockedPurge).not.toHaveBeenCalled();
  });

  it('never reaches the purge when the deployment is unconfigured', async () => {
    delete process.env.CRON_SECRET;
    const response = await POST(post({ authorization: `Bearer ${SECRET}` }));
    expect(response.status).toBe(503);
    expect(mockedPurge).not.toHaveBeenCalled();
  });

  it('runs the purge once and reports counts, not data', async () => {
    mockedPurge.mockResolvedValue({
      at: '2026-09-11T03:30:00.000Z',
      reports: ['NB-1', 'NB-2'],
      foundItems: ['FI-1'],
      contacts: 3,
    });
    const response = await POST(post({ authorization: `Bearer ${SECRET}` }));
    expect(response.status).toBe(200);
    expect(mockedPurge).toHaveBeenCalledTimes(1);
    const body = (await response.json()) as { success: boolean; data: Record<string, unknown> };
    expect(body.success).toBe(true);
    expect(body.data).toEqual({
      at: '2026-09-11T03:30:00.000Z',
      reports: 2,
      foundItems: 1,
      contacts: 3,
    });
    // References go to the log so a run is auditable; the body carries counts.
    expect(JSON.stringify(body)).not.toContain('NB-1');
  });

  it('fails loudly when the purge throws, so the timer unit fails', async () => {
    mockedPurge.mockRejectedValue(new Error('connection refused'));
    const response = await POST(post({ authorization: `Bearer ${SECRET}` }));
    expect(response.status).toBe(500);
    const body = (await response.json()) as { success: boolean };
    expect(body.success).toBe(false);
  });
});
