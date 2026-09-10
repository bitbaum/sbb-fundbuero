/**
 * GET /api/stations — the stops this deployment has timetable data for.
 *
 * Public: it is a list of railway stations.
 *
 * Deliberately returns ONLY imported stations rather than the full national
 * registry of 59,530 service points. Offering a passenger a station whose
 * timetable we never imported produces an empty suggestion list and looks
 * broken, when the truthful answer is "this deployment does not cover that
 * station yet".
 */

import { asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db, schema } from '@/db/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stations = await db()
      .select({
        id: schema.stops.id,
        uic: schema.stops.uic,
        name: schema.stops.name,
      })
      .from(schema.stops)
      .orderBy(asc(schema.stops.name));

    return NextResponse.json({ success: true, data: stations });
  } catch (error) {
    console.error('[stations] list failed', error);
    return NextResponse.json(
      { success: false, error: 'Could not load stations.' },
      { status: 500 },
    );
  }
}
