-- Deny by default.
--
-- REBUILD.md asks for `ENABLE ROW LEVEL SECURITY` on every table and
-- `REVOKE ALL` from `anon` and `authenticated`. Those two roles are Supabase's;
-- this app runs on plain Postgres on one host, so there is no PostgREST and no
-- role reachable directly from a browser. Applying that instruction literally
-- would create two roles nothing uses and prove nothing.
--
-- The INTENT is what matters and is implemented here: nothing may read or write
-- anything unless it was granted explicitly, and the application does not
-- connect as an owner who can shrug that off.
--
--   1. PUBLIC loses everything, including the CREATE it holds on `public` by
--      default in Postgres < 15 and the implicit USAGE it still holds.
--   2. The app connects as `fundbuero_app`, which OWNS NOTHING. Table owners
--      bypass row-level security unless FORCE is set, so an app that connects
--      as the owner has RLS in name only.
--   3. Every table gets ENABLE plus FORCE ROW LEVEL SECURITY, so the policies
--      below apply to the owner too.
--   4. Grants are enumerated per table. There is no
--      `GRANT ... ON ALL TABLES`, because that silently covers whatever gets
--      added next and the point is that adding a table is a decision.
--
-- Run against a fresh database with:  pnpm run db:setup
--
-- ⚠️ A new table needs an entry here AND in ALL_TABLES in db/schema.ts.
-- db/__tests__/rls.test.ts fails the build if the two disagree — because a
-- table nobody granted access to is a "permission denied" that CI, having no
-- database, cannot otherwise catch.

BEGIN;

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fundbuero_app') THEN
    -- NOLOGIN here; the deployment sets a password out of band. A password in
    -- a migration is a password in git.
    CREATE ROLE fundbuero_app NOLOGIN;
  END IF;
END
$$;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

GRANT USAGE ON SCHEMA public TO fundbuero_app;

-- ---------------------------------------------------------------------------
-- Row-level security, forced so that even the owner is subject to it
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'stops',
    'journeys',
    'journey_calls',
    'formations',
    'formation_coaches',
    'contacts',
    'reports',
    'found_items',
    'identifiers',
    'matches',
    'claims',
    'challenges',
    'claim_resolutions',
    'audit_events'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);

    -- Drop first so this file is idempotent: re-running it must not fail, or
    -- nobody will re-run it and it will drift from the schema.
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_app', t);

    -- The application is trusted to enforce per-record authorisation in
    -- route handlers, where it knows who is asking. This policy exists so the
    -- DEFAULT is closed: any other role, present or future, sees nothing.
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO fundbuero_app USING (true) WITH CHECK (true)',
      t || '_app', t
    );
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- Grants, enumerated on purpose
-- ---------------------------------------------------------------------------

-- Reference data imported from open transport data. The app reads it; only the
-- importer, running as the owner, writes it.
GRANT SELECT ON public.stops             TO fundbuero_app;
GRANT SELECT ON public.journeys          TO fundbuero_app;
GRANT SELECT ON public.journey_calls     TO fundbuero_app;
GRANT SELECT ON public.formations        TO fundbuero_app;
GRANT SELECT ON public.formation_coaches TO fundbuero_app;

-- Operational tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts    TO fundbuero_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports     TO fundbuero_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.found_items TO fundbuero_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.identifiers TO fundbuero_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches     TO fundbuero_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims      TO fundbuero_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges  TO fundbuero_app;

-- A resolution is a record of a decision that was made. Correcting one means
-- recording a new decision, not editing the old one, so there is no UPDATE and
-- no DELETE.
GRANT SELECT, INSERT ON public.claim_resolutions TO fundbuero_app;

-- Append-only, for the same reason and more strongly: an audit log the
-- application can rewrite is not an audit log.
GRANT SELECT, INSERT ON public.audit_events TO fundbuero_app;

COMMIT;
