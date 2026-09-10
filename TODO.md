# TODO — SBB Fundbüro

Split by what the item actually blocks. A thing is a **launch blocker** only if
shipping without it would mislead a user or lose their data — not because it
would be nice.

Verified against the tree on 2026-09-08. Anything not written down here is not
tracked; there is no second list.

---

## Launch blockers

Nothing here is optional before this is described to anyone as working.

- [x] ~~**The found half of a lost-and-found does not exist.**~~ Done:
      `POST /api/found-items` writes them, matching runs on both sides, and the
      seed creates one. Verified end to end against a live database.
- [ ] **No claim flow.** Anyone who sees a found item can claim it. Needs the
      challenge-based resolution described in `AGENTS.md`, and found-item
      details private by default until then.
- [ ] **Staff authentication is a single shared token, not accounts.**
      `lib/server/auth.ts` closed the open door — every staff route now checks
      a server-side secret and FAILS CLOSED when none is configured — but there
      is still no per-person identity, so `claim_resolutions.resolver_name` is
      whatever the actor typed. Real accounts are the remaining work.
- [ ] **Photo upload is declared but impossible.** `images` validates as
      `Joi.array().items(Joi.string().uri())` — URLs the client must already
      host. There is no upload route, no storage, no presign, nothing.
- [ ] **The UI cannot report that the backend is down.**
      `useApiWithFallback` sets `error: null` on the fallback path, so a total
      backend outage renders as a complete, working product on fixtures.
      Fixtures must be visibly fixtures.
- [x] ~~**No migrations.**~~ Done: Drizzle migrations in `db/migrations`,
      applied by `pnpm run db:setup` along with `db/rls.sql`. The container's
      init hook is no longer used — it runs once on an empty volume and never
      again, which is a bootstrap rather than a migration system.
- [x] ~~**Retention is not enforced anywhere.**~~ Done: `delete_after` on every
      table holding personal data, and `pnpm run db:purge` reads it. Proved
      against a real database — a report past its deadline is deleted by name,
      its identifiers cascade, and nothing not yet due is touched. Still needs
      a daily cron on the box.
- [ ] **One language.** `lib/labels.ts` is a single-locale SSOT, not i18n. de,
      fr, it, en are all required.
- [ ] **No `LICENSE` file**, while `README.md` carries an MIT badge. Either add
      the file or drop the badge; a badge for a licence that is not in the repo
      grants nothing.

---

## Security

- [ ] **Hardcoded JWT fallback secret.** `services/reporting/src/middleware/
      auth.ts:44` reads `process.env.JWT_SECRET || 'your-secret-key'`. A
      deployment that forgets to set the variable accepts tokens anyone can
      forge. Fail closed: throw on startup instead.
- [x] ~~**No row-level security.**~~ Done in `db/rls.sql`, and proved against a
      real Postgres rather than asserted. Note the deviation from the brief:
      `anon` and `authenticated` are Supabase roles and this runs on plain
      Postgres with no PostgREST, so creating them would have proved nothing.
      The intent is implemented instead — `REVOKE ALL` from `PUBLIC`, ENABLE
      plus FORCE RLS on all 14 tables, an app role that owns nothing, and
      grants enumerated per table.
- [ ] **No server-side authorisation on mutations.** Every mutation must check
      the actor server-side, not rely on the client not offering the button.
- [ ] **Found-item detail exposure.** Once found items exist, their details must
      not be readable without a resolved claim. A public listing naming a
      recovered phone is a shopping list for opportunists.
- [ ] **Audit log is write-only in practice.** `audit_log` is defined; nothing
      reads it and little writes to it. Claim resolutions in particular must be
      logged with a named resolver.

---

## Regulatory

- [x] ~~**Retention deadlines as a column, with a scheduled purge.**~~ Written
      and tested (`scripts/purge-expired.ts`). The orphan clause carries an
      hour's grace because a contact row is inserted moments before its report,
      outside a transaction — without it a purge landing in that gap would
      delete a contact whose report was about to reference it.
- [ ] **Install the purge on a daily cron on the box.** The script exists and
      works; nothing runs it yet. Until it does, retention is a column and a
      good intention.
- [ ] **VPB Art. 77 (SR 745.11)** governs found property in public transport,
      not the ZGB's general five-year rule: the operator counts as finder but
      may claim no finder's reward (Abs. 2), must notify a known loser and store
      the item appropriately (Abs. 3), and may auction after **three months** —
      **one month** if the item is worth ≤ CHF 50 (Abs. 4). Any retention period
      the product implements has to be consistent with this.
- [ ] **revDSG / nLPD.** A loss report is personal data, often with contact
      details and sometimes a photo of someone's possessions. Needs a lawful
      basis, a stated purpose, a retention period, and deletion on request.
- [ ] **WCAG 2.2 AA, tested rather than assumed.** Swiss public transport is
      covered by the BehiG (Behindertengleichstellungsgesetz, SR 151.3);
      accessibility is not a nice-to-have here.
- [ ] **Trademark.** The `sbb` tenant uses a third-party mark and is a pitch
      artefact. `isConcept: true` must keep emitting the "unabhängiges Konzept"
      notice and `noindex`. Revisit before any tenant with `isConcept: true` is
      served on a public URL.

---

## Keeping the live deployment fed

- [ ] **The timetable import needs a nightly cron.** Journeys are imported per
      OPERATING DATE, so the station suggestions go empty once the imported
      days run out. The box currently holds a small window of days for two
      stations, loaded by hand. Until a schedule refills it, the live demo has
      an expiry date rather than a bug.
- [ ] **The purge job needs a daily cron.** `pnpm run db:purge` works and is
      tested; nothing runs it. Until then retention is a column and a good
      intention — and the deployment now accepts real contact details from the
      public, so this one has a clock on it.

## Needs one free registration

- [ ] **Register for an opentransportdata.swiss API key.** Free and
      self-service at https://api-manager.opentransportdata.swiss/ — create an
      Application and subscribe to the Formation Service. Then
      `OPENTRANSPORTDATA_API_KEY=… pnpm run formations:harvest`, on a daily
      cron.

      This is the only item here with a deadline that does not wait: the
      formation API answers for today..today+3 and there is no archive, so
      every day without it is a day whose coach data cannot be reconstructed
      later from any source. The harvester is written and refuses to run
      without the key.

## Later

Real work, but nothing here misleads anyone in the meantime.

- [ ] Regional operator fragmentation (VBZ, ZVV, PostAuto, SZU, VZO each run
      their own lost-property process). A passenger who loses something on a
      tram has to work out which operator to contact. This is the largest
      unaddressed gap in the Swiss picture, and it is out of scope until the
      single-operator case works end to end.
- [ ] Push notifications rather than an open socket.
- [ ] Offline queue for reports composed without signal.
- [ ] Instrument time-to-report as a product metric, so the assumption the
      product rests on becomes measurable rather than asserted.

---

## Answered questions

Kept because the reasoning is worth more than the conclusion.

- **Rewards for returned items — no.** Not on incentive-design grounds first,
  but legal ones: VPB Art. 77 Abs. 2 bars a transport operator from claiming a
  finder's reward. The behavioural evidence points the same way — Frey &
  Oberholzer-Gee (1997), run on a real Swiss cantonal referendum, found offering
  compensation *halved* acceptance of a nuclear-waste repository (50.8% → 24.6%),
  and raising the amount did not help.
- **Kubernetes — no.** One host behind Caddy. The manifests are deleted.
- **Microservices — no.** Four services, two of them stubs, is a distributed
  system for a product with no users.
