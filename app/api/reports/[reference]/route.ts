/**
 * GET /api/reports/:reference — the status of one report.
 *
 * The reference is the credential. That is a deliberate, and limited, choice:
 * it means a passenger can check their report from any device without an
 * account, which matters for a service used once in a lifetime — and it means
 * anyone holding the reference can see the status, which is why the response
 * carries no contact details and nothing identifying a found item.
 *
 * What it returns about a match is the STRENGTH, never the item. "Something
 * strong may match yours" is what a passenger needs; "a black Fairphone with a
 * cracked corner is at the depot in Bern" is a shopping list.
 */

import { NextResponse } from 'next/server';

import { getReportStatus } from '@/lib/server/reports';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  // Next 16: params is a Promise. This is the async-request-API breaking
  // change, and it is the only place in the app that touches it.
  context: { params: Promise<{ reference: string }> },
) {
  const { reference } = await context.params;

  try {
    const status = await getReportStatus(reference);

    if (!status) {
      // Deliberately identical whether the reference is malformed or simply
      // does not exist — otherwise this endpoint enumerates valid references.
      return NextResponse.json(
        { success: false, error: 'No report with that reference.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    console.error('[reports] status failed', error);
    return NextResponse.json(
      { success: false, error: 'Could not load that report.' },
      { status: 500 },
    );
  }
}
