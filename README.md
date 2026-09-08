# SBB Fundbüro

Report something lost on a train **while you are still on it**, bound to the
actual journey, so staff can search before the vehicle reaches the depot.

> **This is a concept, not an operational service.** It is not affiliated with,
> endorsed by, or connected to SBB. "SBB Fundbüro" is a working name and is
> probably the wrong one — see [Naming](#naming). Nothing here handles real
> lost property.

---

## Honesty first

Every number on this page has a source next to it. Where there is no evidence,
it says so in those words rather than picking a plausible figure.

This section exists because the previous version of this README asserted three
statistics — 1.2 million items lost annually, ~25% recovery, >70% recovery when
reported within 30 minutes — **none of which had a source, and all three of
which turned out to be wrong.** Two were wrong in the direction that flattered
this project. The 30-minute figure, which was the entire justification for the
product, appears to have been invented; searching for it returns only
content-marketing pages citing nothing and contradicting each other.

They are corrected below.

---

## The problem

**What is actually true**, with sources:

| | Figure | Year | Source |
|---|---|---|---|
| Items handed in to SBB's lost-property centre | ~130,000 (≈7,000 more than 2023) | 2024 | [watson](https://www.watson.ch/schweiz/oev/327531280-fundgegenstaende-im-zug-sbb-erhoeht-preise-fuer-verlorene-dinge), [Blick](https://www.blick.ch/wirtschaft/sbb-fundbuero-mit-gebuehrenaufschlag-handy-abholung-kostet-jetzt-25-franken-auch-andere-gegenstaende-kosten-mehr-id21538684.html) — figures attributed to SBB |
| Returned to their owners | **~60%** | 2024 | same |
| Returned to their owners | 52.3% (66,000 of 127,000) | 2016 | [swissinfo](https://www.swissinfo.ch/ger/fundus-der-sbb-fundsachen-gleicht-einer-wundertuete/43375672) |
| Items found **vs** loss reports filed | **~120,000 found / ~180,000 reported** | undated | [RUBICON](https://www.rubicon.eu/en/portfolio-item/lost-property-service-of-the-swiss-federal-railways-sbb/), SBB's lost-property vendor |

Comparators: Deutsche Bahn ~60% returned, up to 90% for laptops
([DB Themendienst](https://www.deutschebahn.com/resource/blob/7036354/8914214628f398132d2d582eb1cc0470/Fundbuero_Themendienst-data.pdf), 2021);
ÖBB 38% ([bahnnews.org](https://www.bahnnews.org/31-037-fundstucke-und-einige-kuriositaten/), 2025).

**SBB's existing service is good.** RUBICON's Nova Find has run it since 2004,
it returns roughly 60% of what reaches it, and it re-matches open loss reports
against later finds automatically — so a report filed on day three is not
penalised relative to one filed on day one.

**The gap is the 60,000.** Roughly 180,000 loss reports chase roughly 120,000
handed-in items. The shortfall is items that never reach the operator at all.
That is a different problem from matching, and matching is the part that already
works.

### The one thing SBB's form does not capture

Walking [SBB's live loss-report form](https://lostandfound.sbb.ch/home/sbb/SBB/app?Culturename=en)
end to end: the description step is deep and well built — for a phone it asks
brand, model, **IMEI**, colour, mobile operator, SIM number, even "describe the
lock screen".

But the *where* step takes the journey as **free text**, labelled "Entire route
incl. transfer points", placeholder `Ins – Bern – Zürich – Chur – Davos`.

**There is no train-number field, no coach field, no seat field.**

That is the wedge, and it is narrow and specific: capture a *verified* trip
identifier, coach and time window instead of a sentence. It is a better front
door to SBB Fundservice, **not a replacement for it**.

---

## The assumption this rests on

**Unverified.** Stated plainly because it is load-bearing:

> We believe a loss reported while the passenger is still on board is more
> likely to be recovered than the same loss reported after the vehicle has
> turned around — because an item still on a seat can be collected, and an item
> that has left with another passenger cannot.

The mechanism is physical, not statistical:

- the vehicle reaches its terminus **10–30 minutes** after you get off
- turnaround cleaning takes **5–15 minutes**
- another passenger can pick the item up **at any moment**
- crew have capacity to look **only during the turnaround**

**We know of no published evidence** — academic, operator, or vendor — that
recovery probability actually declines with time-to-report in a transport
context. We searched for it specifically and did not find it. It may not exist.

So it is instrumented rather than asserted: time-to-report is the product
metric, and every field added to the form is counted as a cost against it. If
the assumption is wrong, the measurement is what will say so.

**Do not repeat any "X% within Y minutes" claim about this product.** There
isn't one.

---

## What is implemented, what is a fixture, what is an assumption

Read this before believing anything the running demo appears to do.

| | Status |
|---|---|
| Passenger reporting UI | **Implemented** |
| Staff notification UI | **Implemented** |
| Passenger → staff handoff in the live demo | **Fixture.** `lib/demo-bus.ts` passes reports between the two views through the browser's own storage. No server is involved. |
| All data on the deployed site | **Fixture.** `lib/mock-data.ts`. The deployed build has no backend configured, so demo mode is on and declared. |
| Backend API | **Implemented and exercised against a live database.** Route handlers under `app/api`, SSE for staff push. |
| Staff authentication | **Implemented, and deliberately minimal.** A single shared token, checked server-side, failing closed. Not per-person accounts — see `TODO.md`. |
| The UI calling that API | **Not yet.** The pages still render fixtures; wiring them up is the next piece of work. |
| Recording a **found** item | **Implemented.** `POST /api/found-items`, staff only. This is the half of a lost-and-found that previously had no write path at all. |
| Matching | **Implemented**, identifier-first, with the score breakdown persisted. Candidates come from identifiers, journey or line — never from description. |
| Claiming an item | **Does not exist.** No challenge, no ownership check. |
| Photo upload | **Does not exist.** The API validates image *URLs the client must already host*. There is no storage. |

| Database schema | **Implemented.** Drizzle migrations, 14 tables, identifier-first. Deny-by-default grants verified live against a real Postgres. |
| Real trip data | **Not yet imported.** The schema and the verified sources are ready; the importer is not written. |
| de / fr / it / en | **Assumption, not implemented.** One locale today. |

`TODO.md` splits the rest by launch blocker / security / regulatory / later.

---

## Data: what Swiss open transport data actually gives us

Researched and probed 2026-09-08. Source for everything below:
**[opentransportdata.swiss](https://opentransportdata.swiss/)**, operated by
SKI+ at SBB on behalf of the federal transport office. Licence: *open use,
**must provide the source***
([terms](https://opendata.swiss/en/terms-of-use)) — commercial use permitted,
attribution mandatory. API keys are free and self-service at
[api-manager.opentransportdata.swiss](https://api-manager.opentransportdata.swiss/).

**We can get:**

| Data | Access | Notes |
|---|---|---|
| **GTFS static timetable** | No key needed | 248 MB zipped, 3.8 GB open. `trips.txt` carries `trip_short_name` (the train number a passenger can read off a board) **and** `original_trip_id`, already populated with the SJYID — the canonical Swiss journey identifier. **This is the trip-binding chain, and it is verified working.** |
| **Ist-Daten** (what actually ran) | No key needed, archive back to 2016 | `FAHRT_BEZEICHNER` is the SJYID, so it joins straight to GTFS. Corroborates that a claimed trip really ran. |
| **Stop/station registry** | No key needed | 59,530 service points with UIC numbers and coordinates. |
| **Train formation** (which coaches, coach numbers, platform sectors) | Free key | ⚠️ **Today through today+3 only.** See below. |
| **Sector boards** (`sektortafel`, [data.sbb.ch](https://data.sbb.ch/)) | No key needed | 5,355 physical sector positions with coordinates — turns "sector D" into a map pin. |
| **GTFS-RT** (delays, cancellations) | Free key, 5 req/min | |
| **Occupancy forecast** | Free key | Forecast only, 92 days forward. |

**We cannot get:**

- **Historical train formation — at all.** The API rejects past dates
  (horizon: today + 3 days) and **no archive exists** (four candidate archive
  endpoints probed, all 404). A loss report is always filed *after* the trip.
  **If we want coach-level binding we have to harvest the formation feed
  ourselves, daily, starting on day one.** Every unharvested day is permanently
  unreconstructable. This is the highest-priority engineering task and the only
  irreversible one.
- **Live vehicle positions.** Explicitly not published on the platform.
- **Any API into SBB Fundservice / Nova Find / easyfind.** None found. Without
  one, we can only file into SBB the way a human does. (Not-found, not
  proven-absent — resolving it means talking to RUBICON or SKI+.)
- **Formation for most regional operators.** Only 11 railway undertakings
  consent to publication; most urban and regional transit is absent.

**Deliberately not used:** `search.ch` / `transport.opendata.ch`. Both are alive
and keyless, but licensed *"für eigene Zwecke"* with no sublicensing and
revocable *"jederzeit ohne Vorankündigung"*
([terms](https://search.ch/fahrplan/api/terms)). Everything they offer is
available from opentransportdata.swiss under a genuinely open licence.

Also **not used**: the SJYID list CSV, which is scheduled for discontinuation on
14 December 2026. GTFS `original_trip_id` gives the same mapping.

---

## Design decisions worth knowing

**Matching is identifier-first, then spacetime, then description.** An IMEI plus
a plausible trip is near-certain. A journey collapses the search space in a way
a city street cannot. Description similarity is supporting evidence only and
must never outrank the other two — "black umbrella" sits close to every other
black umbrella in embedding space and produces a confident-looking number over
noise. Every match persists a visible score breakdown; no opaque model output
in the matching path.

**Found-item details are private by default,** and ownership is resolved by a
challenge — the claimant describes something the listing does not show. A public
listing naming a recovered phone is a shopping list.

**No rewards, ever.** Not primarily a design opinion: a Swiss transport operator
is legally barred from claiming a finder's reward (VPB Art. 77 Abs. 2,
[SR 745.11](https://www.fedlex.admin.ch/eli/cc/2009/739/de)). The behavioural
evidence points the same way — [Frey & Oberholzer-Gee (1997)](https://gwern.net/doc/economics/1997-frey.pdf),
run on a real Swiss cantonal referendum, found that offering compensation
*halved* acceptance (50.8% → 24.6%) and that raising the amount did not help.

**Deny by default in the database, not only in the app.** `db/rls.sql` revokes
everything from `PUBLIC`, enables *and forces* row-level security on all 14
tables, and enumerates grants one table at a time — there is no
`GRANT ... ON ALL TABLES`, because that would silently cover whatever is added
next. The application connects as `fundbuero_app`, which owns nothing (a table
owner bypasses RLS unless it is FORCEd). Reference data imported from open
data is read-only to the app; `claim_resolutions` and `audit_events` have no
UPDATE or DELETE at all, because a log the application can rewrite is not a
log. Verified live: the app role reads reports and is refused on all three.

**Retention is a column with a purge job,** not a paragraph. Under VPB Art. 77
Abs. 4 a transport operator may auction a found item after three months — one
month if it is worth ≤ CHF 50. Items found on transport premises must be handed
to staff (ZGB Art. 720 Abs. 3, [SR 210](https://www.fedlex.admin.ch/eli/cc/24/233_245_233/de)).

**The operator is configuration, not code.** Identity lives in
`lib/tenant.ts` and one CSS block; `pnpm run check:tenant` fails the
build if an operator name appears anywhere else. `AGENTS.md` has the detail.

---

## Naming

The working name puts a third-party trademark in the repository name and the
URL. SBB's brand guidance is explicit that the logo and emblem may be used
["only in consultation with SBB Brand Management"](https://digital.sbb.ch/en/foundation/brand/copyrights/)
and not commercially. That guidance addresses brand assets rather than project
names, and this build carries no SBB logo, ships the neutral house brand by
default, and renders an "unabhängiges Konzept" notice with `noindex` on any
build that does use the SBB livery.

Even so, **attributing the data is not the same as borrowing the brand**, and a
neutral product name would cost nothing. This is an open question, not a settled
decision.

---

## Running it

```bash
pnpm install
pnpm run dev                     # http://localhost:3005 — fixtures, no backend
```

One app, one `package.json`, one lockfile. There is no `frontend/` directory
and no workspace: this is a modular monolith, and the module boundaries are
directories, not deployment units.

| Path | |
|---|---|
| `/` | Passenger app |
| `/staff` | Staff interface |
| `/demo` | Concept overview |

`pnpm run verify` is the single definition of green — format, types, lint,
tests, and the tenant SSOT check. CI runs it verbatim.

### With a database

```bash
docker compose up -d
export DATABASE_URL=postgresql://postgres:postgres@localhost:5433/sbb_fundbuero
pnpm run db:setup      # migrations, then deny-by-default grants
pnpm run db:seed       # fixtures, every row prefixed DEMO- / demo:
```

That gives you a real schema with real data in it, on a clean machine, in
three commands.

Then, with `STAFF_ACCESS_TOKEN` set to something at least 16 characters long:

```bash
# file a report — no account, no login
curl -X POST localhost:3005/api/reports -H 'content-type: application/json' \
  -d '{"category":"electronics","description":"Schwarzes Handy",
       "identifiers":[{"kind":"imei","value":"49 015420 323751 8"}],
       "contact":{"email":"you@example.invalid"}}'

# which train was I on? — a stop and a time, no train number
curl "localhost:3005/api/trips/suggest?stopId=demo:stop:zurich-hb&at=<ISO time>"

# the crew stream
curl -N -H "x-staff-token: $STAFF_ACCESS_TOKEN" localhost:3005/api/events
```

⚠️ **Be precise about what that does and does not mean.** The API is real and
was exercised against a live database. **The UI is not yet calling it** — the
pages still render fixtures from `lib/mock-data.ts`, so seeing data in the
browser is not evidence that any of this ran.

The seed is deliberately conspicuous: `DEMO-F-0001` shares an IMEI with
`DEMO-R-0001` and must outrank `DEMO-F-0002`, which agrees only on words. That
is the matching rule, visible in the data.

---

## Attribution

Timetable, journey and formation data from
**[opentransportdata.swiss](https://opentransportdata.swiss/)**, used under its
terms of use, which require the source to be cited.

---

## Licence

Not yet chosen. This README previously carried an MIT badge with no `LICENSE`
file in the repository, which grants nothing; the badge is gone until the file
exists.
