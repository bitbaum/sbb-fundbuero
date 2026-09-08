/**
 * GET /api/trips/suggest?stopId=…&at=…
 *
 * "Which train were you on?", answered without asking. The passenger names a
 * stop and roughly when; this proposes journeys that called there around then,
 * and the passenger confirms one — so the report binds to a real journey
 * identifier instead of to a sentence.
 *
 * Public and unauthenticated: it reads the published timetable, which is open
 * data, and it is the first thing a report needs.
 *
 * It NEVER picks for the passenger. `usable: false` means the list is not one
 * a person can choose from — nothing matched, too many did, or several cannot
 * be told apart on screen — and the UI must fall back to asking rather than
 * quietly binding the report to the top row. A report bound to the wrong train
 * is worse than an unbound one, because it looks like data.
 */

import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db, schema } from '@/db/client';
import {
  isUsableSuggestion,
  rankCandidates,
  type CandidateJourney,
} from '@/lib/domain/trip-suggestion';
import { suggestTripsInput } from '@/lib/server/validation';

export const dynamic = 'force-dynamic';

/** Fetch a little wider than we rank, so the ranking has something to reject. */
const FETCH_MARGIN_MINUTES = 30;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = suggestTripsInput.safeParse({
    stopId: url.searchParams.get('stopId') ?? undefined,
    at: url.searchParams.get('at') ?? undefined,
    windowMinutes: url.searchParams.get('windowMinutes') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Give a stop and a time.',
        details: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const at = new Date(parsed.data.at);
  const windowMinutes = parsed.data.windowMinutes ?? 45;
  const margin = (windowMinutes + FETCH_MARGIN_MINUTES) * 60_000;

  try {
    const rows = await db()
      .select({
        journeyId: schema.journeys.id,
        sjyid: schema.journeys.sjyid,
        operatingDate: schema.journeys.operatingDate,
        trainNumber: schema.journeys.trainNumber,
        line: schema.journeys.line,
        calledAt: schema.journeyCalls.departureAt,
        arrivedAt: schema.journeyCalls.arrivalAt,
      })
      .from(schema.journeyCalls)
      .innerJoin(schema.journeys, eq(schema.journeyCalls.journeyId, schema.journeys.id))
      .where(
        and(
          eq(schema.journeyCalls.stopId, parsed.data.stopId),
          gte(schema.journeyCalls.departureAt, new Date(at.getTime() - margin)),
          lte(schema.journeyCalls.departureAt, new Date(at.getTime() + margin)),
        ),
      )
      .orderBy(asc(schema.journeyCalls.departureAt))
      .limit(50);

    const candidates: CandidateJourney[] = [];
    for (const r of rows) {
      // A call with neither a departure nor an arrival time cannot be ranked
      // against a stated time, and a row we cannot place is not a suggestion.
      const called = r.calledAt ?? r.arrivedAt;
      if (!called) continue;

      candidates.push({
        journeyId: r.journeyId,
        sjyid: r.sjyid,
        operatingDate: r.operatingDate,
        trainNumber: r.trainNumber,
        line: r.line,
        originName: null,
        destinationName: null,
        calledAt: called.toISOString(),
      });
    }

    const ranked = rankCandidates(candidates, at, { windowMinutes });

    return NextResponse.json({
      success: true,
      data: {
        usable: isUsableSuggestion(ranked),
        suggestions: ranked.map((r) => ({
          journeyId: r.journeyId,
          trainNumber: r.trainNumber,
          line: r.line,
          calledAt: r.calledAt,
          offsetMinutes: r.offsetMinutes,
          // The ranking is shown, not hidden. A passenger choosing between two
          // trains deserves to know why one is listed first.
          reason: r.reason,
        })),
      },
    });
  } catch (error) {
    console.error('[trips] suggest failed', error);
    return NextResponse.json(
      { success: false, error: 'Could not look up journeys.' },
      { status: 500 },
    );
  }
}
