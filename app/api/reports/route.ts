/**
 * POST /api/reports — file a loss report (public)
 * GET  /api/reports — recent reports (staff only)
 *
 * Filing is public and unauthenticated on purpose: requiring an account before
 * someone can say "I left my bag on the 14:02" would defeat the product. The
 * READ side is not public, because a list of what strangers have lost, with
 * the coach they were sitting in, is not something to hand out.
 */

import { NextResponse } from 'next/server';

import { authoriseStaff } from '@/lib/server/auth';
import { createReport, listRecentReports } from '@/lib/server/reports';
import { badRequest, createReportInput } from '@/lib/server/validation';

// This reads and writes per request; caching it would be wrong in both
// directions.
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Expected a JSON body.' }, { status: 400 });
  }

  const parsed = createReportInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(badRequest(parsed.error), { status: 400 });
  }

  try {
    const created = await createReport(parsed.data);
    return NextResponse.json(
      {
        success: true,
        data: {
          reference: created.reference,
          possibleMatches: created.matchCount,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    // The reporter gets a reference-free apology, not a stack trace; the
    // operator gets the detail in the journal.
    console.error('[reports] create failed', error);
    return NextResponse.json(
      { success: false, error: 'The report could not be saved. Please try again.' },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const auth = authoriseStaff(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.reason }, { status: auth.status });
  }

  try {
    return NextResponse.json({ success: true, data: await listRecentReports() });
  } catch (error) {
    console.error('[reports] list failed', error);
    return NextResponse.json({ success: false, error: 'Could not load reports.' }, { status: 500 });
  }
}
