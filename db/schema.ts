/**
 * The database, in one file.
 *
 * Shape of the model, and why:
 *
 *   RAIL-NATIVE.        journeys / journey_calls / formations, with a loss
 *                       bound to a journey and a place inside the vehicle. A
 *                       journey collapses the search space in a way a city
 *                       street cannot — that is the product's one real
 *                       technical advantage and it is not generalised away.
 *
 *   IDENTIFIER-FIRST.   `identifiers` is the point of the rebuild. An exact
 *                       IMEI beside a plausible trip is near-certain; "black
 *                       umbrella" is not evidence of anything.
 *
 *   PRIVATE BY DEFAULT. Found-item details are not public. A listing naming a
 *                       recovered phone is a shopping list, so ownership is
 *                       resolved by a challenge rather than by description.
 *
 *   RETENTION IS A COLUMN. Every table holding personal data carries
 *                       delete_after, and a purge job reads it. Retention
 *                       enforced by documentation does not happen.
 *
 * What is deliberately ABSENT: `reward_offered`. A Swiss transport operator
 * may not claim a finder's reward at all (VPB Art. 77 Abs. 2, SR 745.11), and
 * paying for prosocial behaviour is a documented way to reduce it (Frey &
 * Oberholzer-Gee 1997, on a real Swiss referendum: offering compensation
 * halved acceptance, 50.8% -> 24.6%, and raising the amount did not help).
 *
 * Every table here must also appear in db/rls.sql. `db/__tests__/rls.test.ts`
 * fails the build if one does not — a new table that nobody granted access to
 * is a "permission denied" the app only discovers in production.
 */

import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------------------
// Reference data, imported from Swiss open transport data
// ---------------------------------------------------------------------------

/**
 * Stops, from the public service-point registry. `id` is the SLOID
 * (ch:1:sloid:...), which is the stable national identifier; `uic` is the
 * number that appears in GTFS as `didok` and in Ist-Daten as BPUIC.
 */
export const stops = pgTable(
  'stops',
  {
    id: text('id').primaryKey(),
    uic: integer('uic'),
    name: text('name').notNull(),
    lat: numeric('lat', { precision: 9, scale: 6 }),
    lon: numeric('lon', { precision: 9, scale: 6 }),
    importedAt: createdAt(),
  },
  (t) => [index('stops_uic_idx').on(t.uic), index('stops_name_idx').on(t.name)],
);

/**
 * One run of one train on one day.
 *
 * `sjyid` is the Swiss Journey ID — the canonical national identifier for a
 * journey, and the join key between GTFS (`trips.original_trip_id`), Ist-Daten
 * (`FAHRT_BEZEICHNER`) and the formation API. `trainNumber` is what a
 * passenger can actually read off a departure board, which is why both exist.
 */
export const journeys = pgTable(
  'journeys',
  {
    id: id(),
    sjyid: text('sjyid').notNull(),
    operatingDate: date('operating_date').notNull(),
    trainNumber: text('train_number'),
    line: text('line'),
    operatorCode: text('operator_code'),
    originStopId: text('origin_stop_id').references(() => stops.id),
    destinationStopId: text('destination_stop_id').references(() => stops.id),
    departureAt: timestamp('departure_at', { withTimezone: true }),
    arrivalAt: timestamp('arrival_at', { withTimezone: true }),
    importedAt: createdAt(),
  },
  (t) => [
    uniqueIndex('journeys_sjyid_date_key').on(t.sjyid, t.operatingDate),
    index('journeys_train_number_idx').on(t.trainNumber, t.operatingDate),
  ],
);

/** Where a journey calls, and when. This is what turns "here, now" into "which train". */
export const journeyCalls = pgTable(
  'journey_calls',
  {
    id: id(),
    journeyId: uuid('journey_id')
      .notNull()
      .references(() => journeys.id, { onDelete: 'cascade' }),
    stopId: text('stop_id')
      .notNull()
      .references(() => stops.id),
    sequence: integer('sequence').notNull(),
    arrivalAt: timestamp('arrival_at', { withTimezone: true }),
    departureAt: timestamp('departure_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('journey_calls_journey_sequence_key').on(t.journeyId, t.sequence),
    index('journey_calls_stop_time_idx').on(t.stopId, t.departureAt),
  ],
);

/**
 * A harvested train formation.
 *
 * This table exists because the upstream API has NO HISTORY: it answers only
 * for today through today+3 and there is no archive (checked 2026-09-08 —
 * four candidate archive endpoints, all 404). A loss report is always filed
 * after the trip, so a formation we did not capture on the day is
 * unreconstructable forever. Hence a daily harvester and a table to put it in,
 * rather than a lookup at report time that could never work.
 */
export const formations = pgTable(
  'formations',
  {
    id: id(),
    journeyId: uuid('journey_id')
      .notNull()
      .references(() => journeys.id, { onDelete: 'cascade' }),
    harvestedAt: createdAt(),
    /** Named so a future reader knows which feed and version this came from. */
    source: text('source').notNull(),
  },
  (t) => [uniqueIndex('formations_journey_key').on(t.journeyId)],
);

/** One coach within a harvested formation, as the passenger sees it. */
export const formationCoaches = pgTable(
  'formation_coaches',
  {
    id: id(),
    formationId: uuid('formation_id')
      .notNull()
      .references(() => formations.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    /** The number printed on the coach — the only one a passenger can report. */
    coachNumber: text('coach_number'),
    /** European Vehicle Number: globally unique, useful for the operator. */
    evn: text('evn'),
    /** Platform sectors this coach stops at, e.g. "A,B". */
    sectors: text('sectors'),
    track: text('track'),
  },
  (t) => [uniqueIndex('formation_coaches_position_key').on(t.formationId, t.position)],
);

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

/**
 * Contact details, deliberately in their own table.
 *
 * Personal data lives in exactly one place so that an erasure request, or the
 * purge job, is one row rather than a hunt through every table that happened
 * to copy an email address.
 */
export const contacts = pgTable(
  'contacts',
  {
    id: id(),
    email: text('email'),
    phone: text('phone'),
    locale: text('locale').notNull().default('de'),
    deleteAfter: timestamp('delete_after', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index('contacts_delete_after_idx').on(t.deleteAfter),
    // At least one way to reach the person, or the record cannot do its job.
    check('contacts_reachable', sql`${t.email} IS NOT NULL OR ${t.phone} IS NOT NULL`),
  ],
);

// ---------------------------------------------------------------------------
// The two halves of a lost-and-found
// ---------------------------------------------------------------------------

/** A passenger's loss report. */
export const reports = pgTable(
  'reports',
  {
    id: id(),
    /** Short, human-readable, safe to read out on the phone. */
    reference: text('reference').notNull(),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),

    // Spacetime: the second matching signal.
    journeyId: uuid('journey_id').references(() => journeys.id),
    coach: text('coach'),
    seat: text('seat'),
    /** Where in the vehicle: seat, table, overhead, floor, wc, entrance, unknown. */
    area: text('area'),
    lostFrom: timestamp('lost_from', { withTimezone: true }),
    lostTo: timestamp('lost_to', { withTimezone: true }),

    // Description: supporting evidence only. Never outranks the above.
    category: text('category').notNull(),
    description: text('description').notNull(),
    /** Pre-tokenised by lib/domain/tokenise so matching stays pure. */
    descriptionTokens: text('description_tokens').array(),
    colour: text('colour'),
    brand: text('brand'),

    state: text('state').notNull().default('submitted'),
    locale: text('locale').notNull().default('de'),
    deleteAfter: timestamp('delete_after', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('reports_reference_key').on(t.reference),
    index('reports_journey_idx').on(t.journeyId),
    index('reports_state_idx').on(t.state),
    index('reports_delete_after_idx').on(t.deleteAfter),
    // A window that ends before it starts is not a window.
    check(
      'reports_window_ordered',
      sql`${t.lostTo} IS NULL OR ${t.lostFrom} IS NULL OR ${t.lostTo} >= ${t.lostFrom}`,
    ),
  ],
);

/**
 * Something handed in.
 *
 * `disposalEligibleAt` is statute (VPB Art. 77 Abs. 4): three months, or one
 * month at CHF 50 or less. `deleteAfter` is our own retention policy and is a
 * separate column on purpose — the law says when the OBJECT may be sold, not
 * when the RECORD must be deleted.
 */
export const foundItems = pgTable(
  'found_items',
  {
    id: id(),
    reference: text('reference').notNull(),

    journeyId: uuid('journey_id').references(() => journeys.id),
    coach: text('coach'),
    seat: text('seat'),
    area: text('area'),
    foundAt: timestamp('found_at', { withTimezone: true }).notNull(),
    /** Who handed it in or picked it up. A staff identifier, not a name. */
    foundBy: text('found_by'),
    /** Where it physically is now. Never shown to a claimant before release. */
    custodyLocation: text('custody_location').notNull(),

    category: text('category').notNull(),
    description: text('description').notNull(),
    descriptionTokens: text('description_tokens').array(),
    colour: text('colour'),
    brand: text('brand'),
    estimatedValueChf: numeric('estimated_value_chf', { precision: 10, scale: 2 }),

    state: text('state').notNull().default('in_custody'),
    disposalEligibleAt: timestamp('disposal_eligible_at', { withTimezone: true }).notNull(),
    deleteAfter: timestamp('delete_after', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('found_items_reference_key').on(t.reference),
    index('found_items_journey_idx').on(t.journeyId),
    index('found_items_state_idx').on(t.state),
    index('found_items_disposal_idx').on(t.disposalEligibleAt),
    index('found_items_delete_after_idx').on(t.deleteAfter),
  ],
);

/**
 * The identifier table — the most important change in the rebuild.
 *
 * One table for both halves, with two nullable foreign keys and a check that
 * exactly one is set. That keeps referential integrity real (a polymorphic
 * `item_id` column cannot be a foreign key to anything) while leaving a single
 * index on (kind, value), which is what makes an identifier lookup the first
 * and cheapest thing the matcher does.
 *
 * `value` is the NORMALISED form — see lib/domain/identifiers. Comparing a raw
 * value against a normalised one is the failure that would silently disable
 * the strongest signal in the system, so the raw text is kept separately in
 * `valueDisplay` and never compared.
 */
export const identifiers = pgTable(
  'identifiers',
  {
    id: id(),
    reportId: uuid('report_id').references(() => reports.id, { onDelete: 'cascade' }),
    foundItemId: uuid('found_item_id').references(() => foundItems.id, { onDelete: 'cascade' }),
    /** imei | serial | registration | engraving | iban_last4 | other */
    kind: text('kind').notNull(),
    value: text('value').notNull(),
    valueDisplay: text('value_display'),
    verified: boolean('verified').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    // The lookup the whole design turns on.
    index('identifiers_kind_value_idx').on(t.kind, t.value),
    index('identifiers_report_idx').on(t.reportId),
    index('identifiers_found_item_idx').on(t.foundItemId),
    uniqueIndex('identifiers_report_unique')
      .on(t.reportId, t.kind, t.value)
      .where(sql`${t.reportId} IS NOT NULL`),
    uniqueIndex('identifiers_found_item_unique')
      .on(t.foundItemId, t.kind, t.value)
      .where(sql`${t.foundItemId} IS NOT NULL`),
    check('identifiers_exactly_one_owner', sql`num_nonnulls(${t.reportId}, ${t.foundItemId}) = 1`),
  ],
);

/**
 * A computed link between a report and a found item.
 *
 * `breakdown` is not decoration. It is the score: deterministic arithmetic,
 * one row per contributing signal, persisted so that staff and passengers can
 * see WHY two records were linked months later. There is no model output here.
 */
export const matches = pgTable(
  'matches',
  {
    id: id(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    foundItemId: uuid('found_item_id')
      .notNull()
      .references(() => foundItems.id, { onDelete: 'cascade' }),
    /** identifier | strong | plausible | weak — see lib/domain/matching. */
    tier: text('tier').notNull(),
    points: integer('points').notNull(),
    breakdown: jsonb('breakdown').notNull(),
    /** Signals that actively disagree. Never lowers the tier; always shown. */
    conflicts: jsonb('conflicts')
      .notNull()
      .default(sql`'[]'::jsonb`),
    state: text('state').notNull().default('proposed'),
    decidedBy: text('decided_by'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    computedAt: createdAt(),
  },
  (t) => [
    uniqueIndex('matches_pair_key').on(t.reportId, t.foundItemId),
    index('matches_tier_idx').on(t.tier, t.points),
    index('matches_state_idx').on(t.state),
  ],
);

// ---------------------------------------------------------------------------
// Ownership
// ---------------------------------------------------------------------------

/**
 * A claim is an assertion, not a transfer. It becomes a transfer only after a
 * challenge is answered and a named person resolves it — see
 * lib/domain/lifecycle, which has no path from `opened` to `upheld`.
 */
export const claims = pgTable(
  'claims',
  {
    id: id(),
    foundItemId: uuid('found_item_id')
      .notNull()
      .references(() => foundItems.id, { onDelete: 'cascade' }),
    claimantContactId: uuid('claimant_contact_id').references(() => contacts.id, {
      onDelete: 'set null',
    }),
    /** Set when the claimant already filed a loss report. Often null. */
    reportId: uuid('report_id').references(() => reports.id, { onDelete: 'set null' }),
    state: text('state').notNull().default('opened'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('claims_found_item_idx').on(t.foundItemId), index('claims_state_idx').on(t.state)],
);

/**
 * The challenge: describe something the listing does not show.
 *
 * Question and answer live together because a question asked and never
 * answered is itself the outcome, and separating them into two tables would
 * make "unanswered" a join that is easy to forget.
 */
export const challenges = pgTable(
  'challenges',
  {
    id: id(),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'cascade' }),
    question: text('question').notNull(),
    askedBy: text('asked_by').notNull(),
    askedAt: createdAt(),
    answer: text('answer'),
    answeredAt: timestamp('answered_at', { withTimezone: true }),
  },
  (t) => [index('challenges_claim_idx').on(t.claimId)],
);

/**
 * How a claim ended, who ended it, and how sure they were.
 *
 * `resolverName` is not nullable. Art. 21 revDSG gives a person the right not
 * to be subject to a decision with legal effect taken solely by automated
 * processing, and handing over property is exactly such a decision — so there
 * is no way to record a resolution without recording the human who made it.
 */
export const claimResolutions = pgTable(
  'claim_resolutions',
  {
    id: id(),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'cascade' }),
    /** upheld | rejected */
    outcome: text('outcome').notNull(),
    /** certain | probable | insufficient */
    confidence: text('confidence').notNull(),
    resolverName: text('resolver_name').notNull(),
    resolverStaffId: text('resolver_staff_id'),
    rationale: text('rationale'),
    decidedAt: createdAt(),
  },
  (t) => [index('claim_resolutions_claim_idx').on(t.claimId)],
);

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

/**
 * Append-only record of who did what.
 *
 * Every claim resolution writes here. The previous schema had an audit_log
 * table that nothing read and almost nothing wrote — a table plus a query is
 * not an ability.
 */
export const auditEvents = pgTable(
  'audit_events',
  {
    id: id(),
    entityKind: text('entity_kind').notNull(),
    entityId: uuid('entity_id').notNull(),
    action: text('action').notNull(),
    actor: text('actor').notNull(),
    payload: jsonb('payload'),
    at: createdAt(),
  },
  (t) => [
    index('audit_events_entity_idx').on(t.entityKind, t.entityId),
    index('audit_events_at_idx').on(t.at),
  ],
);

/**
 * Every table in this schema, by name.
 *
 * Used by db/__tests__/rls.test.ts to prove that db/rls.sql covers all of
 * them. Adding a table without adding it here makes that test fail, which is
 * the point: a table nobody granted access to is a "permission denied" that
 * only shows up in production, and CI has no database to catch it.
 */
export const ALL_TABLES = [
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
  'audit_events',
] as const;
