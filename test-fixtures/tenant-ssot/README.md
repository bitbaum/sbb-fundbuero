Fixture sources for `lib/__tests__/tenant-ssot-guard.test.ts`.

They live outside `app/`, `components/` and `lib/` on purpose. The guard under
test scans exactly those three directories, so a fixture containing the very
string the guard looks for would make the guard fail on its own test data —
the classic case of a repository-scanning check indexing itself.

The alternative was to exempt `__tests__` from the guard, which would have
punched a real hole in it to accommodate a test. Moving the fixtures out costs
nothing and keeps the exemption list exactly as narrow as it was.
