/**
 * Creating and reading loss reports and found items.
 *
 * The domain decides; this persists. Every rule with judgement in it —
 * retention deadlines, identifier normalisation, tokenisation, matching —
 * lives in lib/domain and is called from here, so none of it needs a database
 * to test.
 */

import { desc, eq } from 'drizzle-orm';

import { db, schema } from '@/db/client';
import { parseIdentifier } from '@/lib/domain/identifiers';
import { foundItemRetention, reportRetention } from '@/lib/domain/retention';
import { tokenise } from '@/lib/domain/tokenise';
import { publish } from './events';
import { matchFoundItem, matchReport } from './matching-service';
import type { CreateFoundItemInput, CreateReportInput } from './validation';

/**
 * A reference a person can read out over the phone.
 *
 * No I, O, 0 or 1 — they are the characters people get wrong when reading
 * aloud, and a reference exists to be read aloud. 32^6 is ~10^9, which is
 * plenty when combined with a uniqueness check.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function reference(prefix: 'R' | 'F'): string {
  let out = '';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `${prefix}-${out.slice(0, 3)}-${out.slice(3)}`;
}

export interface CreatedReport {
  id: string;
  reference: string;
  matchCount: number;
}

export async function createReport(input: CreateReportInput): Promise<CreatedReport> {
  const database = db();
  const now = new Date();

  // Contact details go in their own row, so an erasure request or the purge
  // job is one delete rather than a hunt through every table.
  const [contact] = await database
    .insert(schema.contacts)
    .values({
      email: input.contact.email ?? null,
      phone: input.contact.phone ?? null,
      locale: input.locale,
      deleteAfter: reportRetention(now, null).deleteAfter,
    })
    .returning();

  const [report] = await database
    .insert(schema.reports)
    .values({
      reference: reference('R'),
      contactId: contact.id,
      journeyId: input.journeyId ?? null,
      coach: input.coach ?? null,
      seat: input.seat ?? null,
      area: input.area ?? null,
      lostFrom: input.lostFrom ? new Date(input.lostFrom) : null,
      lostTo: input.lostTo ? new Date(input.lostTo) : null,
      category: input.category,
      description: input.description,
      descriptionTokens: tokenise(input.description),
      colour: input.colour ?? null,
      brand: input.brand ?? null,
      state: 'submitted',
      locale: input.locale,
      deleteAfter: reportRetention(now, null).deleteAfter,
    })
    .returning();

  // Identifiers are normalised and structurally checked before they are
  // stored. A malformed IMEI is dropped rather than saved as a value that can
  // never match anything — see lib/domain/identifiers.
  const identifiers = input.identifiers
    .map((raw) => ({ raw, parsed: parseIdentifier(raw.kind, raw.value) }))
    .filter((i) => i.parsed !== null);

  if (identifiers.length > 0) {
    await database.insert(schema.identifiers).values(
      identifiers.map((i) => ({
        reportId: report.id,
        kind: i.parsed!.kind,
        value: i.parsed!.value,
        valueDisplay: i.raw.value,
        verified: i.parsed!.verified ?? false,
      })),
    );
  }

  const matches = await matchReport(report.id);

  // The payload carries no description, no contact details and no identifier
  // values. It goes to every connected crew device, and a push notification is
  // not a place to put somebody's phone number.
  publish('report.submitted', {
    reference: report.reference,
    category: report.category,
    journeyId: report.journeyId,
    coach: report.coach,
    area: report.area,
    matchCount: matches.length,
  });

  return { id: report.id, reference: report.reference, matchCount: matches.length };
}

export async function createFoundItem(
  input: CreateFoundItemInput,
  actor: string,
): Promise<{ id: string; reference: string; matchCount: number }> {
  const database = db();
  const foundAt = new Date(input.foundAt);
  const retention = foundItemRetention(foundAt, input.estimatedValueChf ?? null);

  const [item] = await database
    .insert(schema.foundItems)
    .values({
      reference: reference('F'),
      journeyId: input.journeyId ?? null,
      coach: input.coach ?? null,
      seat: input.seat ?? null,
      area: input.area ?? null,
      foundAt,
      foundBy: actor,
      custodyLocation: input.custodyLocation,
      category: input.category,
      description: input.description,
      descriptionTokens: tokenise(input.description),
      colour: input.colour ?? null,
      brand: input.brand ?? null,
      estimatedValueChf:
        input.estimatedValueChf === null || input.estimatedValueChf === undefined
          ? null
          : input.estimatedValueChf.toFixed(2),
      state: 'in_custody',
      disposalEligibleAt: retention.disposalEligibleAt,
      deleteAfter: retention.deleteAfter,
    })
    .returning();

  const identifiers = input.identifiers
    .map((raw) => ({ raw, parsed: parseIdentifier(raw.kind, raw.value) }))
    .filter((i) => i.parsed !== null);

  if (identifiers.length > 0) {
    await database.insert(schema.identifiers).values(
      identifiers.map((i) => ({
        foundItemId: item.id,
        kind: i.parsed!.kind,
        value: i.parsed!.value,
        valueDisplay: i.raw.value,
        // A staff member read this off the object, so it is verified in the
        // sense that matters: somebody looked.
        verified: true,
      })),
    );
  }

  const matches = await matchFoundItem(item.id);

  publish('found_item.recorded', {
    reference: item.reference,
    category: item.category,
    journeyId: item.journeyId,
    matchCount: matches.length,
  });

  return { id: item.id, reference: item.reference, matchCount: matches.length };
}

/**
 * What a passenger may see about their own report.
 *
 * Note what is absent: anything identifying a FOUND item. A passenger is told
 * that a possible match exists and how strong it is, never what it is or where
 * it is — otherwise the status page becomes the public listing that the whole
 * claim flow exists to avoid.
 */
export async function getReportStatus(ref: string) {
  const database = db();

  const report = await database.query.reports.findFirst({
    where: eq(schema.reports.reference, ref),
  });
  if (!report) return null;

  const matches = await database
    .select({
      tier: schema.matches.tier,
      state: schema.matches.state,
      computedAt: schema.matches.computedAt,
    })
    .from(schema.matches)
    .where(eq(schema.matches.reportId, report.id))
    .orderBy(desc(schema.matches.points));

  return {
    reference: report.reference,
    state: report.state,
    category: report.category,
    createdAt: report.createdAt,
    deleteAfter: report.deleteAfter,
    possibleMatches: matches.map((m) => ({
      strength: m.tier,
      state: m.state,
      foundAt: m.computedAt,
    })),
  };
}

/** The crew view: recent reports, with their match counts. */
export async function listRecentReports(limit = 50) {
  const database = db();

  return database
    .select({
      reference: schema.reports.reference,
      state: schema.reports.state,
      category: schema.reports.category,
      description: schema.reports.description,
      coach: schema.reports.coach,
      seat: schema.reports.seat,
      area: schema.reports.area,
      journeyId: schema.reports.journeyId,
      lostFrom: schema.reports.lostFrom,
      createdAt: schema.reports.createdAt,
    })
    .from(schema.reports)
    .orderBy(desc(schema.reports.createdAt))
    .limit(limit);
}
