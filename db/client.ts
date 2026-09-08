/**
 * The one database connection.
 *
 * There is deliberately no fallback URL here. `lib/config.ts` explains the
 * same rule for the browser: a default that looks helpful in development
 * ships into production and points at something that is not the database.
 * Server-side the failure is quieter and worse — an app that starts, serves
 * pages, and fails only on the first write.
 *
 * So an unset DATABASE_URL is a startup error with the command that fixes it,
 * not a shrug.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

declare global {
  // `var` is required here: `let`/`const` in a global declaration do not
  // attach to globalThis, which is the whole point of this block.
  // eslint-disable-next-line no-var, vars-on-top
  var __fundbueroSql: ReturnType<typeof postgres> | undefined;
}

function connectionString(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. For local development:\n' +
        '  docker compose up -d\n' +
        '  export DATABASE_URL=postgresql://postgres:postgres@localhost:5433/sbb_fundbuero\n' +
        '  pnpm run db:setup && pnpm run db:seed',
    );
  }

  return url;
}

/**
 * One pool per process, kept on globalThis so Next's dev-mode module reloading
 * does not open a new pool on every edit until Postgres refuses connections.
 */
function client() {
  if (!globalThis.__fundbueroSql) {
    globalThis.__fundbueroSql = postgres(connectionString(), {
      max: 10,
      // The app has no long transactions; failing fast beats queueing behind a
      // connection that is never coming back.
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return globalThis.__fundbueroSql;
}

export function db() {
  return drizzle(client(), { schema });
}

export { schema };
