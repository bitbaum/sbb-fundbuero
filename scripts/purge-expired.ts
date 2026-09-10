/**
 * Delete what is past its retention deadline.
 *
 * The deadline is a COLUMN — every table holding personal data carries
 * `delete_after` — and this is the job that reads it. Retention enforced by a
 * paragraph in a policy document is retention that does not happen; the column
 * without this script is the same thing with extra steps.
 *
 * Run it daily. It is idempotent, it deletes nothing that is not due, and it
 * reports what it did so a quiet run is distinguishable from a broken one.
 *
 * WHAT IT DELETES, AND WHY IN THIS ORDER
 *
 *   1. reports past delete_after      — identifiers, matches and challenges
 *                                       follow by ON DELETE CASCADE
 *   2. found_items past delete_after  — same
 *   3. contacts past delete_after, and any contact no report or claim still
 *      points at. A contact row is the actual personal data; it outliving its
 *      report is the failure this whole design exists to prevent.
 *
 * Audit events are NOT deleted. They record that a decision was made and by
 * whom; they carry no contact details, and an audit log that erases itself is
 * not an audit log. If that ever needs to change it is a deliberate decision,
 * not a side effect of this job.
 */

import { lt, sql } from 'drizzle-orm';

import { db, schema } from '../db/client';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      'DATABASE_URL is not set — nothing to purge, and that is not the same as nothing being due.',
    );
    process.exit(1);
  }

  const database = db();
  const now = new Date();

  const reports = await database
    .delete(schema.reports)
    .where(lt(schema.reports.deleteAfter, now))
    .returning({ reference: schema.reports.reference });

  const foundItems = await database
    .delete(schema.foundItems)
    .where(lt(schema.foundItems.deleteAfter, now))
    .returning({ reference: schema.foundItems.reference });

  // Contacts past their own deadline, plus any left with nothing pointing at
  // them — a report deleted above takes its contact's reason to exist with it.
  // The orphan clause is guarded by an age check, and that guard is not
  // cosmetic: createReport inserts the CONTACT first and the report a moment
  // later, outside a transaction. A purge landing in that gap would delete a
  // contact whose report was about to reference it. An hour is far longer than
  // that window and far shorter than any retention period.
  // ISO strings with an explicit cast, not Date objects: the driver rejects a
  // Date inside a raw template ("The 'string' argument must be of type string
  // … Received an instance of Date"). A purge job that throws on every run is
  // a purge job that never runs, and nothing else would have noticed.
  const orphanGrace = new Date(now.getTime() - 60 * 60 * 1000);

  const contacts = await database.execute(sql`
    DELETE FROM contacts c
    WHERE
      c.delete_after < ${now.toISOString()}::timestamptz
      OR (
        c.created_at < ${orphanGrace.toISOString()}::timestamptz
        AND NOT EXISTS (SELECT 1 FROM reports r WHERE r.contact_id = c.id)
        AND NOT EXISTS (SELECT 1 FROM claims cl WHERE cl.claimant_contact_id = c.id)
      )
    RETURNING c.id
  `);

  // postgres-js returns the rows as an array; the RETURNING clause makes its
  // length the count of what was actually deleted.
  const contactCount = contacts.length;

  console.log(
    `purge ${now.toISOString()}: ` +
      `${reports.length} reports, ${foundItems.length} found items, ${contactCount} contacts`,
  );

  // Named, so a log line proves WHICH records went rather than just how many.
  for (const r of reports) console.log(`  report ${r.reference}`);
  for (const f of foundItems) console.log(`  found item ${f.reference}`);

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
