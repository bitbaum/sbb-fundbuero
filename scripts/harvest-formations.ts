/**
 * Archive today's train formations, because nobody else does.
 *
 * THIS IS THE ONE IRREVERSIBLE JOB IN THE REPOSITORY.
 *
 * The formation API answers only for today through today+3. There is no
 * archive — checked 2026-09-08 against the platform's own archive index, whose
 * complete navigation is actual_data, timetable_gtfs, timetable_hrdf,
 * timetable_hrdf_auto, timetable_netex, timetable_on_demand and sjyid; four
 * candidate formation endpoints were probed and all 404.
 *
 * A loss report is always filed AFTER the trip. So the coach a passenger names
 * — "I was in coach 7" — can only ever be resolved against a formation that
 * was captured on the day. Every day this job does not run is a day whose
 * coach-level data cannot be reconstructed from any source, ever.
 *
 * Hence: a cron, not a lookup at report time. A lookup at report time could
 * never have worked, and would have failed quietly by returning nothing.
 *
 * ⚠️ IT NEEDS AN API KEY AND DOES NOTHING WITHOUT ONE.
 *
 * Registration is free and self-service at
 * https://api-manager.opentransportdata.swiss/ — create an application,
 * subscribe to the Formation Service, and set OPENTRANSPORTDATA_API_KEY.
 * Until then this exits non-zero with that instruction rather than logging a
 * shrug, because a harvester that silently does nothing is indistinguishable
 * from one that is working on a quiet day.
 */

import { and, eq, isNull } from 'drizzle-orm';

import { db, schema } from '../db/client';

const BASE = 'https://api.opentransportdata.swiss/formation/v2';
const SOURCE = 'opentransportdata.swiss formation v2';

/** Railway undertakings that publish formations. SBB passenger traffic is SBBP. */
const EVU = 'SBBP';

/** 50 req/min on the free tier; stay well under it. */
const REQUEST_SPACING_MS = 1500;

interface FormationCoach {
  position: number;
  number?: string;
  evn?: string;
  sectors?: string;
  track?: string;
}

function requireKey(): string {
  const key = process.env.OPENTRANSPORTDATA_API_KEY;

  if (!key) {
    console.error(
      'OPENTRANSPORTDATA_API_KEY is not set, so no formation can be fetched.\n\n' +
        'This job is the only irreversible one here: the API answers only for\n' +
        'today..today+3 and there is no archive, so a day not harvested is a day\n' +
        'whose coach data cannot be reconstructed later from any source.\n\n' +
        'Registration is free and self-service:\n' +
        '  1. https://api-manager.opentransportdata.swiss/\n' +
        '  2. create an Application, subscribe to the Formation Service\n' +
        '  3. export OPENTRANSPORTDATA_API_KEY=<key>\n',
    );
    process.exit(1);
  }

  return key;
}

async function fetchFormation(
  key: string,
  trainNumber: string,
  operationDate: string,
): Promise<FormationCoach[] | null> {
  const url = `${BASE}/formations_full?evu=${EVU}&operationDate=${operationDate}&trainNumber=${encodeURIComponent(trainNumber)}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (response.status === 404) return null;

  if (response.status === 429) {
    throw new Error('rate limited (429) — lower the request rate or run fewer trains per pass');
  }

  if (!response.ok) {
    throw new Error(
      `formation API ${response.status} for train ${trainNumber} on ${operationDate}`,
    );
  }

  const body = (await response.json()) as {
    formationsVehicles?: { vehicles?: Record<string, unknown>[] }[];
  };

  const vehicles = body.formationsVehicles?.flatMap((f) => f.vehicles ?? []) ?? [];

  return vehicles.map((v, i) => ({
    position: Number(v.position ?? i + 1),
    number: typeof v.number === 'string' ? v.number : undefined,
    evn: typeof v.evn === 'string' ? v.evn : undefined,
    sectors: typeof v.sectors === 'string' ? v.sectors : undefined,
    track: typeof v.track === 'string' ? v.track : undefined,
  }));
}

async function main() {
  const key = requireKey();
  const operationDate = process.argv[2] ?? new Date().toISOString().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(operationDate)) {
    console.error(`date must be YYYY-MM-DD, got ${operationDate}`);
    process.exit(1);
  }

  const database = db();

  // Only journeys we already imported, that we do not already have a
  // formation for. Re-running the job on the same day is therefore cheap and
  // safe, which is what makes it suitable for a cron that may fire twice.
  const pending = await database
    .select({
      id: schema.journeys.id,
      trainNumber: schema.journeys.trainNumber,
    })
    .from(schema.journeys)
    .leftJoin(schema.formations, eq(schema.formations.journeyId, schema.journeys.id))
    .where(and(eq(schema.journeys.operatingDate, operationDate), isNull(schema.formations.id)));

  const withNumbers = pending.filter((p) => p.trainNumber);

  console.log(
    `→ ${withNumbers.length} journeys on ${operationDate} without a formation ` +
      `(${pending.length - withNumbers.length} skipped: no train number)`,
  );

  let harvested = 0;
  let absent = 0;

  for (const journey of withNumbers) {
    try {
      const coaches = await fetchFormation(key, journey.trainNumber!, operationDate);

      if (coaches === null || coaches.length === 0) {
        absent++;
      } else {
        const [formation] = await database
          .insert(schema.formations)
          .values({ journeyId: journey.id, source: SOURCE })
          .onConflictDoNothing()
          .returning();

        if (formation) {
          await database.insert(schema.formationCoaches).values(
            coaches.map((c) => ({
              formationId: formation.id,
              position: c.position,
              coachNumber: c.number ?? null,
              evn: c.evn ?? null,
              sectors: c.sectors ?? null,
              track: c.track ?? null,
            })),
          );
          harvested++;
        }
      }
    } catch (error) {
      // One train failing must not cost the whole day. The window is three
      // days wide and then the data is gone for good, so partial is very much
      // better than nothing.
      console.error(`  ✗ train ${journey.trainNumber}: ${(error as Error).message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, REQUEST_SPACING_MS));
  }

  console.log(`✓ harvested ${harvested} formations, ${absent} not published by the operator`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
