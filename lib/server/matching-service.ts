/**
 * The impure half of matching: read rows, hand them to the pure function,
 * write the result back.
 *
 * lib/domain/matching.ts knows nothing about a database and must stay that
 * way — that is what makes the ordering rule testable without standing
 * anything up. Everything here is the translation layer.
 *
 * The candidate set is deliberately narrow, in this order:
 *
 *   1. anything sharing an identifier value      (an index lookup)
 *   2. anything on the same journey              (an index lookup)
 *   3. anything on the same line and day
 *
 * Description is NOT a way in. Fetching every item of the same category and
 * scoring it by word overlap is how a matcher ends up confidently ranking a
 * thousand black umbrellas; if nothing shares an identifier, a journey or a
 * line, there is no match to find and saying so is the correct answer.
 */

import { and, eq, inArray, or, sql } from 'drizzle-orm';

import { db, schema } from '@/db/client';
import { computeMatch, type MatchSubject } from '@/lib/domain/matching';
import type { Identifier, IdentifierKind } from '@/lib/domain/identifiers';

type ReportRow = typeof schema.reports.$inferSelect;
type FoundItemRow = typeof schema.foundItems.$inferSelect;
type IdentifierRow = typeof schema.identifiers.$inferSelect;
type JourneyRow = typeof schema.journeys.$inferSelect;

function journeyKey(journey: JourneyRow | null): string | null {
  return journey ? `${journey.sjyid}@${journey.operatingDate}` : null;
}

function lineKey(journey: JourneyRow | null): string | null {
  if (!journey) return null;
  const label = journey.trainNumber ?? journey.line;
  return label ? `${label}@${journey.operatingDate}` : null;
}

function toIdentifiers(rows: IdentifierRow[]): Identifier[] {
  return rows.map((r) => ({
    kind: r.kind as IdentifierKind,
    value: r.value,
    verified: r.verified,
  }));
}

function reportSubject(
  report: ReportRow,
  journey: JourneyRow | null,
  identifiers: IdentifierRow[],
): MatchSubject {
  return {
    identifiers: toIdentifiers(identifiers),
    journeyKey: journeyKey(journey),
    lineKey: lineKey(journey),
    coach: report.coach,
    from: report.lostFrom?.toISOString() ?? null,
    to: report.lostTo?.toISOString() ?? null,
    category: report.category,
    descriptionTokens: report.descriptionTokens ?? [],
    colour: report.colour,
    brand: report.brand,
  };
}

function foundSubject(
  item: FoundItemRow,
  journey: JourneyRow | null,
  identifiers: IdentifierRow[],
): MatchSubject {
  return {
    identifiers: toIdentifiers(identifiers),
    journeyKey: journeyKey(journey),
    lineKey: lineKey(journey),
    coach: item.coach,
    from: item.foundAt.toISOString(),
    to: item.foundAt.toISOString(),
    category: item.category,
    descriptionTokens: item.descriptionTokens ?? [],
    colour: item.colour,
    brand: item.brand,
  };
}

export interface PersistedMatch {
  reportId: string;
  foundItemId: string;
  tier: string;
  points: number;
}

/**
 * Recompute matches for one report against every plausible found item.
 *
 * Idempotent: re-running produces the same rows. A match a human has already
 * decided on is left alone — recomputation must never silently reopen a
 * decision somebody made.
 */
export async function matchReport(reportId: string): Promise<PersistedMatch[]> {
  const database = db();

  const report = await database.query.reports.findFirst({
    where: eq(schema.reports.id, reportId),
  });
  if (!report) return [];

  const reportIdentifiers = await database
    .select()
    .from(schema.identifiers)
    .where(eq(schema.identifiers.reportId, reportId));

  const journey = report.journeyId
    ? ((await database.query.journeys.findFirst({
        where: eq(schema.journeys.id, report.journeyId),
      })) ?? null)
    : null;

  const candidates = await candidateFoundItems(report, journey, reportIdentifiers);
  if (candidates.length === 0) return [];

  const subject = reportSubject(report, journey, reportIdentifiers);

  const candidateIds = candidates.map((c) => c.id);
  const candidateIdentifiers = await database
    .select()
    .from(schema.identifiers)
    .where(inArray(schema.identifiers.foundItemId, candidateIds));

  const journeyIds = [...new Set(candidates.map((c) => c.journeyId).filter(Boolean))] as string[];
  const journeys = journeyIds.length
    ? await database.select().from(schema.journeys).where(inArray(schema.journeys.id, journeyIds))
    : [];
  const journeyById = new Map(journeys.map((j) => [j.id, j]));

  const persisted: PersistedMatch[] = [];

  for (const candidate of candidates) {
    const theirIdentifiers = candidateIdentifiers.filter((i) => i.foundItemId === candidate.id);
    const theirJourney = candidate.journeyId
      ? (journeyById.get(candidate.journeyId) ?? null)
      : null;

    const result = computeMatch(subject, foundSubject(candidate, theirJourney, theirIdentifiers));

    // A pair that agrees on nothing is not a match, and writing it would bury
    // the real ones under noise.
    if (result.tier === 'none') continue;

    await database
      .insert(schema.matches)
      .values({
        reportId: report.id,
        foundItemId: candidate.id,
        tier: result.tier,
        points: result.points,
        breakdown: result.breakdown,
        conflicts: result.conflicts,
        state: 'proposed',
      })
      .onConflictDoUpdate({
        target: [schema.matches.reportId, schema.matches.foundItemId],
        set: {
          tier: result.tier,
          points: result.points,
          breakdown: result.breakdown,
          conflicts: result.conflicts,
          computedAt: new Date(),
        },
        // Leave a decided match alone. Recomputation must not reopen a
        // decision a person already made.
        where: eq(schema.matches.state, 'proposed'),
      });

    persisted.push({
      reportId: report.id,
      foundItemId: candidate.id,
      tier: result.tier,
      points: result.points,
    });
  }

  return persisted;
}

/**
 * Candidates by identifier, journey, or line — never by description.
 */
async function candidateFoundItems(
  report: ReportRow,
  journey: JourneyRow | null,
  reportIdentifiers: IdentifierRow[],
): Promise<FoundItemRow[]> {
  const database = db();
  const ids = new Set<string>();

  if (reportIdentifiers.length > 0) {
    const pairs = reportIdentifiers.map((i) =>
      and(eq(schema.identifiers.kind, i.kind), eq(schema.identifiers.value, i.value)),
    );
    const hits = await database
      .select({ foundItemId: schema.identifiers.foundItemId })
      .from(schema.identifiers)
      .where(and(sql`${schema.identifiers.foundItemId} IS NOT NULL`, or(...pairs)));

    for (const h of hits) if (h.foundItemId) ids.add(h.foundItemId);
  }

  if (journey) {
    const sameJourney = await database
      .select({ id: schema.foundItems.id })
      .from(schema.foundItems)
      .where(eq(schema.foundItems.journeyId, journey.id));
    for (const r of sameJourney) ids.add(r.id);

    // Same line, same day: a passenger who picks the wrong departure from the
    // suggestion list is a normal case, not a rare one.
    const label = journey.trainNumber ?? journey.line;
    if (label) {
      const sameLine = await database
        .select({ id: schema.foundItems.id })
        .from(schema.foundItems)
        .innerJoin(schema.journeys, eq(schema.foundItems.journeyId, schema.journeys.id))
        .where(
          and(
            eq(schema.journeys.operatingDate, journey.operatingDate),
            or(eq(schema.journeys.trainNumber, label), eq(schema.journeys.line, label)),
          ),
        );
      for (const r of sameLine) ids.add(r.id);
    }
  }

  if (ids.size === 0) return [];

  return database
    .select()
    .from(schema.foundItems)
    .where(inArray(schema.foundItems.id, [...ids]));
}

/** The mirror image, for when a found item is recorded first. */
export async function matchFoundItem(foundItemId: string): Promise<PersistedMatch[]> {
  const database = db();

  const item = await database.query.foundItems.findFirst({
    where: eq(schema.foundItems.id, foundItemId),
  });
  if (!item) return [];

  const itemIdentifiers = await database
    .select()
    .from(schema.identifiers)
    .where(eq(schema.identifiers.foundItemId, foundItemId));

  const reportIds = new Set<string>();

  if (itemIdentifiers.length > 0) {
    const pairs = itemIdentifiers.map((i) =>
      and(eq(schema.identifiers.kind, i.kind), eq(schema.identifiers.value, i.value)),
    );
    const hits = await database
      .select({ reportId: schema.identifiers.reportId })
      .from(schema.identifiers)
      .where(and(sql`${schema.identifiers.reportId} IS NOT NULL`, or(...pairs)));
    for (const h of hits) if (h.reportId) reportIds.add(h.reportId);
  }

  if (item.journeyId) {
    const sameJourney = await database
      .select({ id: schema.reports.id })
      .from(schema.reports)
      .where(eq(schema.reports.journeyId, item.journeyId));
    for (const r of sameJourney) reportIds.add(r.id);
  }

  const results: PersistedMatch[] = [];
  for (const reportId of reportIds) {
    results.push(...(await matchReport(reportId)));
  }
  return results;
}
