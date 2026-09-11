/**
 * Delete what is past its retention deadline — from a shell.
 *
 * The purge itself is `lib/server/purge.ts`, shared with the
 * `/api/cron/purge` route the box's timer calls. This wrapper exists for a
 * developer or an operator with a database URL and no running app: it prints
 * what went and exits non-zero on failure, so a cron line built on it would
 * also be alertable.
 */

import { purgeExpired } from '../lib/server/purge';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      'DATABASE_URL is not set — nothing to purge, and that is not the same as nothing being due.',
    );
    process.exit(1);
  }

  const result = await purgeExpired();

  console.log(
    `purge ${result.at}: ` +
      `${result.reports.length} reports, ${result.foundItems.length} found items, ${result.contacts} contacts`,
  );

  // Named, so a log line proves WHICH records went rather than just how many.
  for (const r of result.reports) console.log(`  report ${r}`);
  for (const f of result.foundItems) console.log(`  found item ${f}`);

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
