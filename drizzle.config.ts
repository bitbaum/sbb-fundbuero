import type { Config } from 'drizzle-kit';

/**
 * Migrations are generated into db/migrations and applied with drizzle-kit.
 *
 * The previous schema was raw SQL in database/init/, applied by the Postgres
 * container's entrypoint — which runs ONCE, on an empty volume, and never
 * again. That is a bootstrap, not a migration system: there was no way to
 * evolve the schema of a database that already had data in it.
 */
export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/sbb_fundbuero',
  },
  strict: true,
  verbose: true,
} satisfies Config;
