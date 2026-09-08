# TODO — SBB Fundbüro

Split by what the item actually blocks. A thing is a **launch blocker** only if
shipping without it would mislead a user or lose their data — not because it
would be nice.

Verified against the tree on 2026-09-08. Anything not written down here is not
tracked; there is no second list.

---

## Launch blockers

Nothing here is optional before this is described to anyone as working.

- [ ] **The found half of a lost-and-found does not exist.** `found_items` is
      declared in the schema and queried by the matching service, but
      `grep -rn 'INSERT INTO found_items'` over every `.ts` and `.sql` returns
      zero — including the seed. Matching queries a permanently empty table and
      can only ever return nothing. A table plus a query is not an ability.
- [ ] **No claim flow.** Anyone who sees a found item can claim it. Needs the
      challenge-based resolution described in `AGENTS.md`, and found-item
      details private by default until then.
- [ ] **`/staff` has no authentication of any kind.** No session, no login, no
      guard — the page renders passenger reports to anyone who opens the URL.
- [ ] **Photo upload is declared but impossible.** `images` validates as
      `Joi.array().items(Joi.string().uri())` — URLs the client must already
      host. There is no upload route, no storage, no presign, nothing.
- [ ] **The UI cannot report that the backend is down.**
      `useApiWithFallback` sets `error: null` on the fallback path, so a total
      backend outage renders as a complete, working product on fixtures.
      Fixtures must be visibly fixtures.
- [ ] **No migrations.** The schema is raw SQL applied by the Postgres
      container's init hook, which runs once on an empty volume and never again.
      There is no way to evolve the schema on a database that already has data.
- [ ] **Retention is not enforced anywhere.** No deletion deadline column, no
      purge job. See *Regulatory*.
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
- [ ] **No row-level security.** Deny by default — `ENABLE ROW LEVEL SECURITY`
      on every table and `REVOKE ALL` from `anon` and `authenticated`, then
      grant back deliberately.
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

- [ ] **Retention deadlines as a column, with a scheduled purge.** Reports,
      images and contact details. Enforced mechanically — retention that lives
      in a document does not happen.
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

## Later

Real work, but nothing here misleads anyone in the meantime.

- [ ] Regional operator fragmentation (VBZ, ZVV, PostAuto, SZU, VZO each run
      their own lost-property process). A passenger who loses something on a
      tram has to work out which operator to contact. This is the largest
      unaddressed gap in the Swiss picture, and it is out of scope until the
      single-operator case works end to end.
- [ ] Occupancy and formation data to narrow "which coach was I in".
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
