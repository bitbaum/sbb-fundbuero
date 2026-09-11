/**
 * Application Configuration
 * Single Source of Truth for runtime config values
 *
 * NOTE: Design tokens (colors, spacing, typography) are in:
 * - tailwind.config.js (build-time, Tailwind classes)
 * - lib/design-system.ts (runtime reference if needed)
 */

/**
 * Where the backend lives, for THIS build.
 *
 * There is deliberately no localhost fallback. A production build ships these
 * values inlined into the browser bundle, so a `|| 'http://localhost:3001'`
 * default does not mean "try the dev backend" — it means every visitor's
 * browser aims the request at port 3001 of *their own machine*. That is what
 * the old sbbfundbuero.orangecat.ch host (now nordbahn.orangecat.ch) shipped
 * until this change: doomed requests, and a real
 * chance of hitting whatever unrelated app a developer happens to run there.
 *
 * Unset therefore means exactly what it says: no backend is reachable from this
 * build. Local development gets its values from `.env.development`, which Next
 * loads in dev only, so the defaults can never leak into a deployed bundle.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? '';

export const config = {
  api: {
    // API Gateway proxies to all services. Empty when no backend is configured.
    baseUrl: API_URL,
    // Notification service for WebSocket. Empty when no backend is configured.
    wsUrl: WS_URL,
    timeout: 10000,
  },

  // Time windows for lost item reporting
  reporting: {
    // Reports within this window get instant driver notification
    instantAlertWindowMinutes: 30,
    // Reports within this window get priority handling
    priorityWindowHours: 2,
    // Reports within this window go to standard queue
    standardWindowHours: 24,
  },

  // Demo mode configuration
  demo: {
    // On when explicitly asked for, and on whenever no backend is configured —
    // running on mock data is then the honest state, not a fallback reached by
    // letting a request fail first.
    //
    // This was `process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || true`, which is
    // `true` for every possible value of the variable. The flag read as
    // configurable and was not, and nothing consumed it anyway.
    enabled: process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || API_URL === '',
    mockDelay: 1500,
    autoNotify: true,
  },

  // Supported languages
  languages: ['de', 'fr', 'it', 'en'] as const,
  defaultLanguage: 'de' as const,

  // UI timing constants (ms)
  timing: {
    toastDuration: 4000,
    successMessageDelay: 2000,
    demoNotificationDelay: 5000,
  },

  // Input validation limits
  validation: {
    description: {
      minLength: 3,
      maxLength: 500,
    },
    notes: {
      maxLength: 1000,
    },
  },
} as const;

export type Config = typeof config;
export type Language = (typeof config.languages)[number];
