/**
 * POST /api/found-items — record something handed in (staff only).
 *
 * This route is the half of a lost-and-found that did not exist. `found_items`
 * was declared in the old schema and queried by the matching service, but
 * nothing anywhere inserted into it — so matching ran against a permanently
 * empty table and could only ever return nothing.
 *
 * There is no GET. Found items are private by default: a public listing naming
 * a recovered phone is a shopping list, and the way to reach one is a claim
 * resolved by a challenge, not a browse.
 */

import { NextResponse } from 'next/server';

import { authoriseStaff } from '@/lib/server/auth';
import { createFoundItem } from '@/lib/server/reports';
import { badRequest, createFoundItemInput } from '@/lib/server/validation';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = authoriseStaff(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.reason }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Expected a JSON body.' }, { status: 400 });
  }

  const parsed = createFoundItemInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(badRequest(parsed.error), { status: 400 });
  }

  try {
    const created = await createFoundItem(parsed.data, auth.actor);
    return NextResponse.json(
      {
        success: true,
        data: { reference: created.reference, possibleMatches: created.matchCount },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[found-items] create failed', error);
    return NextResponse.json(
      { success: false, error: 'The item could not be recorded.' },
      { status: 500 },
    );
  }
}
