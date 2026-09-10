/**
 * Import one operating day of the Swiss timetable, so a passenger can name a
 * stop and a rough time instead of a train number.
 *
 * Source: opentransportdata.swiss GTFS, downloadable with no API key. Licence
 * requires the source to be cited; see the README.
 *
 * WHY IT IS BOUNDED BY DATE AND STATION
 *
 * The feed is 248 MB zipped and 3.83 GB open — stop_times.txt alone is 3.07 GB.
 * Importing all of it, for every service day, would be several hundred million
 * rows to answer one question: "which trains called here around then". So the
 * import takes an operating date and a set of stations, and keeps only the
 * journeys that actually call at one of them. That is the smallest thing that
 * makes the product work, and it is a nightly job, not a request path.
 *
 * WHY IT STREAMS
 *
 * Nothing is extracted to disk and no file is read into memory. `unzip -p`
 * writes one member to stdout and this reads it line by line, so the peak
 * footprint is the active-trip map rather than 3.8 GB.
 *
 * stop_times.txt is grouped by trip_id and ordered by stop_sequence, which is
 * what lets a trip be accumulated and flushed in one pass. That grouping is an
 * assumption about someone else's file, so it is CHECKED at runtime: if a
 * trip_id reappears after being flushed, the import fails loudly rather than
 * silently importing half a journey.
 *
 * Usage:
 *   tsx scripts/import-gtfs.ts --zip <path> --date 2026-09-08 [--uic 8503000,8507000]
 */

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

import { sql } from 'drizzle-orm';

import { db, schema } from '../db/client';
import {
  EXCEPTION_ADDED,
  EXCEPTION_REMOVED,
  calendarCovers,
  gtfsDateToIso,
  gtfsTimeToDate,
  parseHeader,
  pickStationId,
  splitCsvLine,
} from '../lib/domain/gtfs';

/**
 * Default stations: the busiest Swiss passenger hubs.
 *
 * A starting set, not a policy. Supporting a station is one number here plus a
 * re-import; the cost of each is bounded by how many journeys call there.
 */
// Station names verified against the imported feed rather than from memory:
// 8503016 is Zürich Flughafen and 8502113 is Aarau, both of which this list
// originally mislabelled.
const DEFAULT_UICS = [
  8503000, // Zürich HB
  8507000, // Bern
  8500010, // Basel SBB
  8501120, // Lausanne
  8501008, // Genève
  8505000, // Luzern
  8506000, // Winterthur
  8503016, // Zürich Flughafen
  8509000, // Chur
  8502113, // Aarau
];

interface Args {
  zip: string;
  date: string;
  uics: number[];
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const zip = get('--zip');
  const date = get('--date');
  const uicArg = get('--uic');

  if (!zip || !date) {
    console.error(
      'Usage: tsx scripts/import-gtfs.ts --zip <gtfs.zip> --date YYYY-MM-DD [--uic 8503000,8507000]\n\n' +
        'The feed is a keyless download from opentransportdata.swiss; see README.',
    );
    process.exit(1);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(`--date must be YYYY-MM-DD, got ${date}`);
    process.exit(1);
  }

  return {
    zip,
    date,
    uics: uicArg ? uicArg.split(',').map((s) => Number(s.trim())) : DEFAULT_UICS,
  };
}

/** Stream one member of the zip, line by line, without extracting it. */
async function* lines(zip: string, member: string): AsyncGenerator<string> {
  const child = spawn('unzip', ['-p', zip, member], { stdio: ['ignore', 'pipe', 'pipe'] });

  let stderr = '';
  child.stderr.on('data', (c) => {
    stderr += String(c);
  });

  const failed = new Promise<never>((_, reject) => {
    child.on('error', reject);
    child.on('close', (code) => {
      // Code 0 is success. Anything else means we read a truncated file, and
      // a truncated import is worse than none: it looks like a day with fewer
      // trains rather than a failure.
      if (code !== 0)
        reject(new Error(`unzip -p ${member} exited ${code}: ${stderr.slice(0, 400)}`));
    });
  });
  failed.catch(() => {});

  const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
  try {
    for await (const line of rl) {
      if (line.length > 0) yield line;
    }
  } finally {
    rl.close();
    if (child.exitCode === null) child.kill();
  }

  // Surface a non-zero exit even when the stream ended cleanly.
  await Promise.race([failed, Promise.resolve()]);
}

async function activeServices(args: Args): Promise<Set<string>> {
  const active = new Set<string>();

  let header: Record<string, number> | null = null;
  for await (const line of lines(args.zip, 'calendar.txt')) {
    if (!header) {
      header = parseHeader(line);
      continue;
    }
    const f = splitCsvLine(line);
    const row = {
      serviceId: f[header.service_id],
      days: {
        monday: f[header.monday],
        tuesday: f[header.tuesday],
        wednesday: f[header.wednesday],
        thursday: f[header.thursday],
        friday: f[header.friday],
        saturday: f[header.saturday],
        sunday: f[header.sunday],
      },
      startDate: f[header.start_date],
      endDate: f[header.end_date],
    };
    if (calendarCovers(row, args.date)) active.add(row.serviceId);
  }

  // Exceptions layer on top: type 1 ADDS a day, type 2 REMOVES one. Applying
  // them as a filter rather than a layer would drop every added service.
  let added = 0;
  let removed = 0;
  header = null;
  for await (const line of lines(args.zip, 'calendar_dates.txt')) {
    if (!header) {
      header = parseHeader(line);
      continue;
    }
    const f = splitCsvLine(line);
    if (gtfsDateToIso(f[header.date]) !== args.date) continue;

    const serviceId = f[header.service_id];
    const type = f[header.exception_type];
    if (type === EXCEPTION_ADDED) {
      if (!active.has(serviceId)) added++;
      active.add(serviceId);
    } else if (type === EXCEPTION_REMOVED) {
      if (active.delete(serviceId)) removed++;
    }
  }

  console.log(
    `  services active on ${args.date}: ${active.size} (+${added} / -${removed} by exception)`,
  );
  return active;
}

interface StationSet {
  /** station stop_id -> row to insert */
  stations: Map<string, { id: string; uic: number; name: string; lat: string; lon: string }>;
  /** every stop_id (platform or station) -> station stop_id */
  toStation: Map<string, string>;
}

async function readStations(args: Args): Promise<StationSet> {
  const wanted = new Set(args.uics);
  // uic -> all stop_ids carrying it, so the station row can be chosen after
  // the whole file is seen rather than guessed from the first row.
  const byUic = new Map<number, { ids: string[]; name: string; lat: string; lon: string }>();

  let header: Record<string, number> | null = null;
  for await (const line of lines(args.zip, 'stops.txt')) {
    if (!header) {
      header = parseHeader(line);
      continue;
    }
    const f = splitCsvLine(line);
    const uic = Number(f[header.didok]);
    if (!wanted.has(uic)) continue;

    const entry = byUic.get(uic) ?? {
      ids: [],
      name: f[header.stop_name],
      lat: f[header.stop_lat],
      lon: f[header.stop_lon],
    };
    entry.ids.push(f[header.stop_id]);
    byUic.set(uic, entry);
  }

  const stations = new Map<
    string,
    { id: string; uic: number; name: string; lat: string; lon: string }
  >();
  const toStation = new Map<string, string>();

  for (const [uic, entry] of byUic) {
    const stationId = pickStationId(entry.ids);
    if (!stationId) continue;
    stations.set(stationId, {
      id: stationId,
      uic,
      name: entry.name,
      lat: entry.lat,
      lon: entry.lon,
    });
    for (const id of entry.ids) toStation.set(id, stationId);
  }

  const missing = [...wanted].filter((u) => ![...stations.values()].some((s) => s.uic === u));
  if (missing.length > 0) {
    // Not fatal, but never silent: a UIC that matches nothing is a typo, and
    // the symptom would otherwise be "that station has no trains".
    console.warn(`  ⚠ no stops found for UIC: ${missing.join(', ')}`);
  }

  console.log(`  stations: ${stations.size}, platforms mapped: ${toStation.size}`);
  return { stations, toStation };
}

interface TripMeta {
  sjyid: string;
  trainNumber: string;
  headsign: string;
}

async function readTrips(args: Args, active: Set<string>): Promise<Map<string, TripMeta>> {
  const trips = new Map<string, TripMeta>();

  let header: Record<string, number> | null = null;
  let seen = 0;
  for await (const line of lines(args.zip, 'trips.txt')) {
    if (!header) {
      header = parseHeader(line);
      continue;
    }
    seen++;
    const f = splitCsvLine(line);
    if (!active.has(f[header.service_id])) continue;

    trips.set(f[header.trip_id], {
      // The canonical national journey identifier, and the join key to
      // Ist-Daten and the formation API. Already populated in this feed.
      sjyid: f[header.original_trip_id] ?? '',
      trainNumber: f[header.trip_short_name] ?? '',
      headsign: f[header.trip_headsign] ?? '',
    });
  }

  console.log(`  trips: ${trips.size} active of ${seen} total`);
  return trips;
}

interface Call {
  stationId: string;
  sequence: number;
  arrivalAt: Date | null;
  departureAt: Date | null;
}

interface PendingJourney {
  tripId: string;
  meta: TripMeta;
  calls: Call[];
  firstStation: string | null;
  lastStation: string | null;
  firstDeparture: Date | null;
  lastArrival: Date | null;
}

async function importDay(args: Args) {
  const database = db();

  console.log(`→ reading feed ${args.zip}`);
  const feedVersion = await readFeedVersion(args);
  console.log(`  feed version ${feedVersion}`);

  const active = await activeServices(args);
  const { stations, toStation } = await readStations(args);
  if (stations.size === 0) {
    console.error('No stations matched. Nothing to import.');
    process.exit(1);
  }

  const trips = await readTrips(args, active);

  console.log('→ streaming stop_times.txt (3 GB — this is the slow part)');

  await database
    .insert(schema.stops)
    .values([...stations.values()])
    .onConflictDoNothing();

  let header: Record<string, number> | null = null;
  let currentTripId: string | null = null;
  let pending: PendingJourney | null = null;
  const flushedTrips = new Set<string>();

  let rows = 0;
  let importedJourneys = 0;
  let importedCalls = 0;
  const batch: PendingJourney[] = [];

  const flush = async () => {
    if (!pending) return;
    // Keep only journeys that actually call at a station we support.
    if (pending.calls.length > 0) {
      batch.push(pending);
      if (batch.length >= 500) {
        const [j, c] = await persist(batch, args.date);
        importedJourneys += j;
        importedCalls += c;
        batch.length = 0;
      }
    }
    pending = null;
  };

  for await (const line of lines(args.zip, 'stop_times.txt')) {
    if (!header) {
      header = parseHeader(line);
      continue;
    }

    rows++;
    if (rows % 5_000_000 === 0) {
      console.log(`  … ${(rows / 1e6).toFixed(0)}M rows, ${importedJourneys} journeys kept`);
    }

    const f = splitCsvLine(line);
    const tripId = f[header.trip_id];

    if (tripId !== currentTripId) {
      await flush();
      currentTripId = tripId;

      // The grouping assumption, checked rather than trusted. A trip
      // reappearing after its group closed would mean half a journey was
      // imported and the rest silently dropped.
      if (flushedTrips.has(tripId)) {
        throw new Error(
          `stop_times.txt is not grouped by trip_id: ${tripId} reappeared after its group ended. ` +
            'The importer assumes grouping to stream in constant memory; it must be rewritten if this holds.',
        );
      }
      flushedTrips.add(tripId);

      const meta = trips.get(tripId);
      pending = meta
        ? {
            tripId,
            meta,
            calls: [],
            firstStation: null,
            lastStation: null,
            firstDeparture: null,
            lastArrival: null,
          }
        : null;
    }

    if (!pending) continue;

    const arrivalAt = gtfsTimeToDate(args.date, f[header.arrival_time] ?? '');
    const departureAt = gtfsTimeToDate(args.date, f[header.departure_time] ?? '');

    // Origin and destination come from the whole trip, not only the calls we
    // keep — a passenger recognises "Zürich HB → Lausanne", and the first and
    // last stops are usually outside our station set.
    if (pending.firstDeparture === null && departureAt) pending.firstDeparture = departureAt;
    if (arrivalAt) pending.lastArrival = arrivalAt;

    const stationId = toStation.get(f[header.stop_id]);
    if (stationId) {
      pending.calls.push({
        stationId,
        sequence: Number(f[header.stop_sequence]),
        arrivalAt,
        departureAt,
      });
    }
  }

  await flush();
  if (batch.length > 0) {
    const [j, c] = await persist(batch, args.date);
    importedJourneys += j;
    importedCalls += c;
  }

  console.log('');
  console.log(`✓ imported ${importedJourneys} journeys and ${importedCalls} calls`);
  console.log(`  from ${rows.toLocaleString('en')} stop_time rows, feed version ${feedVersion}`);
  console.log(`  stations: ${[...stations.values()].map((s) => s.name).join(', ')}`);
  process.exit(0);
}

async function readFeedVersion(args: Args): Promise<string> {
  let header: Record<string, number> | null = null;
  for await (const line of lines(args.zip, 'feed_info.txt')) {
    if (!header) {
      header = parseHeader(line);
      continue;
    }
    return splitCsvLine(line)[header.feed_version] ?? 'unknown';
  }
  return 'unknown';
}

async function persist(batch: readonly PendingJourney[], date: string): Promise<[number, number]> {
  const database = db();

  const journeyRows = batch.map((p) => ({
    // A journey with no SJYID still binds a report to a real trip on a real
    // day; falling back to the GTFS trip id keeps it usable and keeps the
    // uniqueness constraint meaningful.
    sjyid: p.meta.sjyid || `gtfs:${p.tripId}`,
    operatingDate: date,
    trainNumber: p.meta.trainNumber || null,
    line: null,
    operatorCode: null,
    originStopId: null,
    destinationStopId: null,
    departureAt: p.firstDeparture,
    arrivalAt: p.lastArrival,
  }));

  // onConflictDoUpdate rather than DoNothing: DoNothing does not RETURN the
  // conflicting rows, so a re-import would find no id for a journey that
  // already exists and silently drop all of its calls. Refreshing the times
  // is also correct — a re-import exists to pick up a newer feed.
  const inserted = await database
    .insert(schema.journeys)
    .values(journeyRows)
    .onConflictDoUpdate({
      target: [schema.journeys.sjyid, schema.journeys.operatingDate],
      set: {
        trainNumber: sql`excluded.train_number`,
        departureAt: sql`excluded.departure_at`,
        arrivalAt: sql`excluded.arrival_at`,
      },
    })
    .returning({ id: schema.journeys.id, sjyid: schema.journeys.sjyid });

  const idBySjyid = new Map(inserted.map((r) => [r.sjyid, r.id]));

  const callRows = batch.flatMap((p) => {
    const journeyId = idBySjyid.get(p.meta.sjyid || `gtfs:${p.tripId}`);
    if (!journeyId) return [];
    return p.calls.map((c) => ({
      journeyId,
      stopId: c.stationId,
      sequence: c.sequence,
      arrivalAt: c.arrivalAt,
      departureAt: c.departureAt,
    }));
  });

  if (callRows.length > 0) {
    await database.insert(schema.journeyCalls).values(callRows).onConflictDoNothing();
  }

  return [inserted.length, callRows.length];
}

importDay(parseArgs(process.argv.slice(2))).catch((error) => {
  console.error(error);
  process.exit(1);
});
