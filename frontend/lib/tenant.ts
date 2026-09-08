/**
 * Tenant SSOT — the only place an operator's identity is defined.
 *
 * This app is white-label. Nothing else in the codebase hardcodes an operator
 * name, wordmark, locale or palette:
 *   - identity strings (wordmark, product name, metadata) live here;
 *   - colours and fonts live in app/globals.css under `:root[data-tenant=...]`;
 *   - <html data-tenant> is set once, in app/layout.tsx, from `tenant` below.
 *
 * Switching operator is therefore one environment variable and no code change:
 *
 *   NEXT_PUBLIC_TENANT=sbb npm run build
 *
 * Adding an operator is two edits: a `TENANTS` entry here, and one override
 * block in globals.css restating only the tokens that actually differ.
 */

export const TENANT_IDS = ['nordbahn', 'sbb'] as const;
export type TenantId = (typeof TENANT_IDS)[number];

export interface Tenant {
  id: TenantId;
  /** Wordmark rendered in the app header. */
  wordmark: string;
  /** Full legal name, for footers and legal copy. */
  legalName: string;
  /** Product name — window title, PWA name, OG title. */
  productName: string;
  /** OG/meta description. */
  description: string;
  /** BCP-47 tag for <html lang>. Drives date/number formatting too. */
  locale: string;
  /** Operator code as it appears in vehicle/trip data. */
  operatorCode: string;
  /**
   * Browser theme colour. Duplicates `--brand` by necessity: Next metadata is
   * serialised before CSS exists, so it cannot read a custom property. This is
   * the one permitted restatement — keep it equal to the tenant's `--brand`.
   */
  themeColor: string;
  /**
   * True when the tenant uses a third-party trademark. Such a build is a
   * pitch artefact, not a product: it renders an "unofficial concept" notice
   * and is served `noindex`. Only a tenant with `isConcept: false` may be
   * deployed publicly.
   */
  isConcept: boolean;
}

export const TENANTS: Record<TenantId, Tenant> = {
  /**
   * The neutral house brand — a fictional operator. This is the DEFAULT and
   * the only tenant that may be deployed publicly, precisely because it
   * impersonates nobody.
   */
  nordbahn: {
    id: 'nordbahn',
    wordmark: 'NORDBAHN',
    legalName: 'Nordbahn AG',
    productName: 'Nordbahn Fundbüro',
    description: 'Verlorene Gegenstände sofort melden — solange der Zug noch unterwegs ist.',
    locale: 'de',
    operatorCode: 'NB',
    themeColor: '#0B4F8F',
    isConcept: false,
  },

  /**
   * SBB theme — for demonstration to SBB only. Uses a third-party trademark,
   * so `isConcept` is true: every surface must state that this is an
   * unofficial concept, and it must never be served on a public URL.
   */
  sbb: {
    id: 'sbb',
    wordmark: 'SBB',
    legalName: 'Schweizerische Bundesbahnen SBB',
    productName: 'SBB Fundbüro',
    description: 'Schnell und einfach verlorene Gegenstände melden — direkt in der App.',
    locale: 'de-CH',
    operatorCode: 'SBB',
    themeColor: '#EB0000',
    isConcept: true,
  },
};

export const DEFAULT_TENANT_ID: TenantId = 'nordbahn';

function resolveTenantId(raw: string | undefined): TenantId {
  // An unknown value must not silently fall back to a *branded* tenant —
  // failing open to someone else's trademark is the one failure mode that
  // actually costs something. Fall back to the neutral house brand.
  if (raw && (TENANT_IDS as readonly string[]).includes(raw)) {
    return raw as TenantId;
  }
  return DEFAULT_TENANT_ID;
}

/**
 * The active tenant. Read from NEXT_PUBLIC_TENANT so it is inlined at build
 * time and available identically on server and client.
 */
export const tenant: Tenant = TENANTS[resolveTenantId(process.env.NEXT_PUBLIC_TENANT)];
