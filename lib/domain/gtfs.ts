/**
 * GTFS parsing rules that are easy to get quietly wrong.
 *
 * Pure, so each one is testable without a 248 MB download. The importer in
 * scripts/import-gtfs.ts does the I/O; the decisions live here.
 */

/**
 * Split one CSV line.
 *
 * GTFS quotes every field in the Swiss feed, and station names contain commas
 * — "Zürich, Bahnhofstrasse" is one field, not two. Splitting on `,` gives a
 * plausible-looking wrong answer for exactly the rows a Swiss product cares
 * most about: tram and bus stops, which is most of them.
 */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // "" inside a quoted field is a literal quote.
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(field);
      field = '';
    } else {
      field += ch;
    }
  }

  out.push(field);
  return out;
}

/**
 * Parse a header row into a name → index map.
 *
 * Strips the UTF-8 BOM, which the Swiss feed puts on the first column of every
 * file. Without this, the first column is named "﻿trip_id" and every
 * lookup of "trip_id" returns undefined — the file parses, every row comes
 * back with an undefined id, and nothing errors.
 */
export function parseHeader(line: string): Record<string, number> {
  const cols = splitCsvLine(line.replace(/^﻿/, ''));
  const index: Record<string, number> = {};
  cols.forEach((name, i) => {
    index[name.trim()] = i;
  });
  return index;
}

/**
 * GTFS times can exceed 24:00:00.
 *
 * "25:30:00" on 2026-09-08 means 01:30 on the 9th — it belongs to the
 * operating day that STARTED on the 8th. A naive `new Date('...T25:30:00')`
 * is Invalid Date, and a naive modulo puts a night train 24 hours in the past,
 * which is the difference between finding someone's bag and telling them no
 * such train ran.
 *
 * @param operatingDate YYYY-MM-DD, the day the service is scheduled under
 * @param time HH:MM:SS, possibly with hours >= 24
 * @returns a UTC instant, or null if the time is unparseable
 */
export function gtfsTimeToDate(operatingDate: string, time: string): Date | null {
  const m = /^(\d{1,3}):(\d{2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;

  const [, hh, mm, ss] = m;
  const hours = Number(hh);
  const minutes = Number(mm);
  const seconds = Number(ss);

  if (minutes > 59 || seconds > 59) return null;

  const base = Date.parse(`${operatingDate}T00:00:00Z`);
  if (Number.isNaN(base)) return null;

  return new Date(base + ((hours * 60 + minutes) * 60 + seconds) * 1000);
}

/** GTFS YYYYMMDD -> YYYY-MM-DD. */
export function gtfsDateToIso(yyyymmdd: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(yyyymmdd.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** 0 = Sunday, matching Date#getUTCDay, mapped onto GTFS's column order. */
const WEEKDAY_COLUMNS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export interface CalendarRow {
  serviceId: string;
  days: Record<string, string>;
  startDate: string;
  endDate: string;
}

/**
 * Is a base calendar entry active on this date?
 *
 * Only the weekly pattern and the validity range — exceptions in
 * calendar_dates.txt are applied separately, because they both ADD (type 1)
 * and REMOVE (type 2) service and must therefore be layered on top rather
 * than merged in.
 */
export function calendarCovers(row: CalendarRow, isoDate: string): boolean {
  const start = gtfsDateToIso(row.startDate);
  const end = gtfsDateToIso(row.endDate);
  if (!start || !end) return false;
  if (isoDate < start || isoDate > end) return false;

  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return row.days[WEEKDAY_COLUMNS[day]] === '1';
}

export const EXCEPTION_ADDED = '1';
export const EXCEPTION_REMOVED = '2';

/**
 * The station a platform belongs to.
 *
 * In the Swiss feed a call is recorded against a PLATFORM
 * (`ch:1:sloid:3000:2:3`), while a passenger names a STATION ("Zürich HB").
 * Every row — platform and station alike — carries the same `didok`, which is
 * the UIC number, so grouping by didok is exact and needs no string surgery on
 * the `Parent…` convention.
 *
 * The station's own row is the one with the shortest stop_id among rows
 * sharing a didok. Deterministic, and it survives the feed changing how it
 * spells parent ids.
 */
export function pickStationId(stopIds: readonly string[]): string | null {
  if (stopIds.length === 0) return null;
  return [...stopIds].sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
}
