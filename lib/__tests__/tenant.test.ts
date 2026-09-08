/**
 * The tenant SSOT is the one part of this app where a bug has a cost outside
 * the app: it decides whose trademark gets rendered. These tests exist for that
 * reason, not for coverage.
 *
 * Two properties are worth guarding:
 *
 *  1. An unrecognised NEXT_PUBLIC_TENANT must fall back to the NEUTRAL house
 *     brand. Failing open to someone else's trademark is the one failure mode
 *     that actually costs something — and a typo in a deploy variable is the
 *     likeliest way to reach it.
 *
 *  2. `Tenant.themeColor` duplicates `--brand` from globals.css. tenant.ts says
 *     so itself, and calls it "the one permitted restatement" (Next serialises
 *     metadata before CSS exists, so it cannot read a custom property). A
 *     documented duplication with nothing checking it is just a second source
 *     of truth waiting to drift.
 */
import fs from 'fs';
import path from 'path';

import { TENANT_IDS, TENANTS, DEFAULT_TENANT_ID, type TenantId } from '../tenant';

const GLOBALS_CSS = path.join(__dirname, '..', '..', 'app', 'globals.css');

/**
 * A tenant that carries a third-party trademark, derived from the registry
 * rather than named.
 *
 * Naming one here would hardcode an operator outside the SSOT — which
 * scripts/check-tenant-ssot.sh correctly rejects, and which would also make
 * these tests wrong the moment the tenant list changes. Deriving it means the
 * suite keeps testing "the branded one" whichever that becomes.
 */
const BRANDED_ID: TenantId =
  TENANT_IDS.find((id) => TENANTS[id].isConcept) ?? TENANT_IDS[TENANT_IDS.length - 1];

/**
 * Re-import tenant.ts with a given NEXT_PUBLIC_TENANT.
 *
 * `tenant` is resolved at module load, so the only honest way to test the
 * resolution is to reload the module. Deliberately NOT done by exporting the
 * internal resolver: that would test a function no caller uses, and would let
 * the real export path regress while the test stayed green.
 */
function loadWithTenant(value: string | undefined) {
  jest.resetModules();
  if (value === undefined) {
    delete process.env.NEXT_PUBLIC_TENANT;
  } else {
    process.env.NEXT_PUBLIC_TENANT = value;
  }
  return require('../tenant') as typeof import('../tenant');
}

/** Read `--brand` out of a `:root`/`:root[data-tenant='id']` block. */
function brandFor(css: string, tenantId: TenantId, defaultTenant: TenantId): string | null {
  const selector =
    tenantId === defaultTenant ? ':root\\s*\\{' : `:root\\[data-tenant='${tenantId}'\\]\\s*\\{`;
  const block = new RegExp(`${selector}([\\s\\S]*?)\\}`).exec(css);
  if (!block) return null;
  const brand = /--brand:\s*(#[0-9A-Fa-f]{3,8})\s*;/.exec(block[1]);
  return brand ? brand[1].toUpperCase() : null;
}

const originalTenant = process.env.NEXT_PUBLIC_TENANT;

afterEach(() => {
  if (originalTenant === undefined) delete process.env.NEXT_PUBLIC_TENANT;
  else process.env.NEXT_PUBLIC_TENANT = originalTenant;
});

describe('tenant registry', () => {
  it('has a TENANTS entry for every declared id', () => {
    for (const id of TENANT_IDS) {
      expect(TENANTS[id]).toBeDefined();
    }
    // And nothing extra: an orphan entry is a tenant nobody can select.
    expect(Object.keys(TENANTS).sort()).toEqual([...TENANT_IDS].sort());
  });

  it('gives every entry an id matching its key', () => {
    for (const id of TENANT_IDS) {
      expect(TENANTS[id].id).toBe(id);
    }
  });

  it('never leaves an identity field blank', () => {
    for (const id of TENANT_IDS) {
      const t = TENANTS[id];
      for (const field of [
        'wordmark',
        'legalName',
        'productName',
        'description',
        'locale',
        'operatorCode',
      ] as const) {
        expect(t[field].trim()).not.toBe('');
      }
    }
  });
});

describe('default tenant', () => {
  it('is one of the declared tenants', () => {
    expect(TENANT_IDS).toContain(DEFAULT_TENANT_ID);
  });

  it('is NOT a concept tenant', () => {
    // The default is what an unset or misspelled env var lands on, and what a
    // stray public deploy would serve. If it were ever a trademarked tenant,
    // every one of those accidents would publish someone else's brand.
    expect(TENANTS[DEFAULT_TENANT_ID].isConcept).toBe(false);
  });
});

describe('resolution of NEXT_PUBLIC_TENANT', () => {
  it('selects a known tenant', () => {
    expect(loadWithTenant(BRANDED_ID).tenant.id).toBe(BRANDED_ID);
  });

  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['whitespace', '  '],
    ['a typo', `${BRANDED_ID}x`],
    ['wrong case', BRANDED_ID.toUpperCase()],
    ['trailing whitespace', `${BRANDED_ID} `],
    ['unknown operator', 'deutschebahn'],
    ['an injection-looking value', `${BRANDED_ID}'; DROP TABLE`],
  ])('falls back to the neutral house brand when the value is %s', (_label, value) => {
    const { tenant } = loadWithTenant(value as string | undefined);
    expect(tenant.id).toBe(DEFAULT_TENANT_ID);
    expect(tenant.isConcept).toBe(false);
  });

  it('never falls back to a trademarked tenant', () => {
    // The property that matters, stated directly rather than inferred from the
    // cases above: no unrecognised input may ever resolve to a concept tenant.
    for (const value of [
      '',
      'nope',
      BRANDED_ID.toUpperCase(),
      `${BRANDED_ID} `,
      ` ${BRANDED_ID}`,
    ]) {
      expect(loadWithTenant(value).tenant.isConcept).toBe(false);
    }
  });
});

describe('themeColor agrees with globals.css', () => {
  const css = fs.readFileSync(GLOBALS_CSS, 'utf8');

  it.each([...TENANT_IDS])('%s themeColor equals its --brand', (id) => {
    const cssBrand = brandFor(css, id, DEFAULT_TENANT_ID);
    expect(cssBrand).not.toBeNull();
    expect(TENANTS[id].themeColor.toUpperCase()).toBe(cssBrand);
  });

  it('gives every non-default tenant an override block', () => {
    // tenant.ts promises "adding an operator is two edits: a TENANTS entry and
    // one override block". A tenant with no block silently renders in the house
    // palette while claiming its own identity.
    for (const id of TENANT_IDS) {
      if (id === DEFAULT_TENANT_ID) continue;
      expect(css).toContain(`:root[data-tenant='${id}']`);
    }
  });
});
