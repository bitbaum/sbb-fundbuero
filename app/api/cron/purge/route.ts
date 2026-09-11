/**
 * POST /api/cron/purge — the retention purge, as the box's timer reaches it.
 *
 * The purge existed as a script (`pnpm run db:purge`) and nothing ran it: the
 * production release is a Next standalone build with no `scripts/` and no
 * `tsx`, so "put it on a cron" had nowhere to stand. The fleet's mechanism for
 * exactly this is a systemd timer calling an HTTP route on localhost with a
 * bearer secret (`appcron-<app>-<job>`), so the purge is exposed as one. The
 * logic lives in `lib/server/purge.ts`; this route and the script are two
 * callers of the same function, not two purges.
 *
 * POST, not GET: it deletes. A crawler or a prefetch must not be able to
 * trigger it even if the secret were ever to leak into a URL.
 */

import { NextResponse } from 'next/server';

import { authoriseCron } from '@/lib/server/auth';
import { purgeExpired } from '@/lib/server/purge';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = authoriseCron(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.reason }, { status: auth.status });
  }

  try {
    const result = await purgeExpired();
    // Counts and references in the log, where a quiet run must be
    // distinguishable from a broken one. References only — never the data.
    console.log(
      `[cron/purge] ${result.at}: ${result.reports.length} reports, ` +
        `${result.foundItems.length} found items, ${result.contacts} contacts`,
    );
    for (const r of result.reports) console.log(`[cron/purge]   report ${r}`);
    for (const f of result.foundItems) console.log(`[cron/purge]   found item ${f}`);

    return NextResponse.json({
      success: true,
      data: {
        at: result.at,
        reports: result.reports.length,
        foundItems: result.foundItems.length,
        contacts: result.contacts,
      },
    });
  } catch (error) {
    console.error('[cron/purge] failed', error);
    // 500 so the timer unit fails and the box's OnFailure alert fires. A purge
    // that fails quietly is the one failure mode this job exists to prevent.
    return NextResponse.json({ success: false, error: 'The purge failed.' }, { status: 500 });
  }
}
