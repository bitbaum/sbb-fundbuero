/**
 * Apply migrations, then lock the database down.
 *
 * Order matters and is the whole reason this is one script rather than two
 * commands in a README: db/rls.sql grants on tables by name, so it has to run
 * AFTER the migration that creates them. Run the other way round it fails
 * loudly, which is fine — but run only halfway, it leaves a database whose
 * tables exist and whose application role cannot read them, and that failure
 * surfaces as a `permission denied` at the first request rather than here.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      'DATABASE_URL is not set.\n\n' +
        '  docker compose up -d\n' +
        '  export DATABASE_URL=postgresql://postgres:postgres@localhost:5433/sbb_fundbuero\n' +
        '  pnpm run db:setup\n',
    );
    process.exit(1);
  }

  // max: 1 — a migration runner that opens a pool can interleave statements
  // across connections and deadlock against its own locks.
  const sql = postgres(url, { max: 1 });

  try {
    console.log('→ applying migrations from db/migrations');
    await migrate(drizzle(sql), { migrationsFolder: join(process.cwd(), 'db', 'migrations') });

    console.log('→ applying db/rls.sql (deny by default, then explicit grants)');
    const rls = readFileSync(join(process.cwd(), 'db', 'rls.sql'), 'utf8');
    // The file is one BEGIN/COMMIT block and contains DO $$ ... $$ bodies, so
    // it must go to the server whole. Splitting on ';' would cut the function
    // bodies in half.
    await sql.unsafe(rls);

    console.log('✓ schema and grants applied');
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
