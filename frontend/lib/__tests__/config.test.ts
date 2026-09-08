/**
 * The API base URL is inlined into the client bundle at build time, so a
 * localhost default is not a development convenience — it is a production
 * value. sbbfundbuero.orangecat.ch shipped `baseUrl: "http://localhost:3001"`, which
 * pointed every visitor's browser at port 3001 of their own machine.
 *
 * These tests exist so that class of bug cannot come back quietly:
 *
 *  1. An unconfigured build must resolve to NO backend, never to localhost.
 *  2. An unconfigured build must therefore be in demo mode, and demo mode must
 *     be a real function of the environment — the flag was once
 *     `env === 'true' || true`, which is `true` for every possible input.
 *  3. A configured build must still talk to its backend.
 */

/**
 * Re-import config.ts under a given environment.
 *
 * The values are resolved at module load, so reloading the module is the only
 * honest way to test them — reaching for an internal resolver would test a
 * function no caller uses and let the real path regress while this stayed green.
 */
function loadConfig(env: Record<string, string | undefined>) {
  jest.resetModules();
  for (const key of ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_WS_URL', 'NEXT_PUBLIC_DEMO_MODE']) {
    const value = env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return (require('../config') as typeof import('../config')).config;
}

const original = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
};

afterAll(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  jest.resetModules();
});

describe('an unconfigured build', () => {
  const env = {
    NEXT_PUBLIC_API_URL: undefined,
    NEXT_PUBLIC_WS_URL: undefined,
    NEXT_PUBLIC_DEMO_MODE: undefined,
  };

  it('resolves to no API host rather than to the visitor’s own machine', () => {
    expect(loadConfig(env).api.baseUrl).toBe('');
  });

  it('resolves to no WebSocket host', () => {
    expect(loadConfig(env).api.wsUrl).toBe('');
  });

  it('never falls back to a localhost URL', () => {
    const { baseUrl, wsUrl } = loadConfig(env).api;
    expect(baseUrl).not.toMatch(/localhost|127\.0\.0\.1/);
    expect(wsUrl).not.toMatch(/localhost|127\.0\.0\.1/);
  });

  it('is in demo mode, so nothing is requested over the network', () => {
    expect(loadConfig(env).demo.enabled).toBe(true);
  });
});

describe('a build configured with a backend', () => {
  const env = {
    NEXT_PUBLIC_API_URL: 'https://api.example.test',
    NEXT_PUBLIC_WS_URL: 'wss://api.example.test/ws',
    NEXT_PUBLIC_DEMO_MODE: undefined,
  };

  it('uses the configured API host', () => {
    expect(loadConfig(env).api.baseUrl).toBe('https://api.example.test');
  });

  it('uses the configured WebSocket host', () => {
    expect(loadConfig(env).api.wsUrl).toBe('wss://api.example.test/ws');
  });

  it('leaves demo mode off so the backend is actually used', () => {
    expect(loadConfig(env).demo.enabled).toBe(false);
  });
});

describe('demo mode is a real function of the environment', () => {
  const withBackend = (demo: string | undefined) => ({
    NEXT_PUBLIC_API_URL: 'https://api.example.test',
    NEXT_PUBLIC_WS_URL: 'wss://api.example.test/ws',
    NEXT_PUBLIC_DEMO_MODE: demo,
  });

  // The guard against `env === 'true' || true`: if the flag is ever tautological
  // again, at least one of these two cases must fail.
  it('is on when explicitly requested, even with a backend configured', () => {
    expect(loadConfig(withBackend('true')).demo.enabled).toBe(true);
  });

  it.each(['false', '', 'TRUE', 'yes', '1', undefined])(
    'is off for NEXT_PUBLIC_DEMO_MODE=%p when a backend is configured',
    (value) => {
      expect(loadConfig(withBackend(value)).demo.enabled).toBe(false);
    },
  );
});
