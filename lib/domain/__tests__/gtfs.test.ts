import {
  calendarCovers,
  gtfsDateToIso,
  gtfsTimeToDate,
  parseHeader,
  pickStationId,
  splitCsvLine,
} from '../gtfs';

describe('CSV splitting', () => {
  it('keeps a comma inside a quoted station name', () => {
    // "Zürich, Bahnhofstrasse" is ONE field. Splitting on `,` gives a
    // plausible-looking wrong answer for tram and bus stops, which are most
    // of the stops in Switzerland.
    const row = splitCsvLine('"ch:1:sloid:1","Zürich, Bahnhofstrasse","47.1","8.5"');
    expect(row).toEqual(['ch:1:sloid:1', 'Zürich, Bahnhofstrasse', '47.1', '8.5']);
  });

  it('handles an escaped quote inside a field', () => {
    expect(splitCsvLine('"say ""hi""","x"')).toEqual(['say "hi"', 'x']);
  });

  it('preserves empty fields, including trailing ones', () => {
    expect(splitCsvLine('"a","","c",""')).toEqual(['a', '', 'c', '']);
    expect(splitCsvLine('a,,c,')).toEqual(['a', '', 'c', '']);
  });

  it('handles unquoted fields, which the spec permits', () => {
    expect(splitCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });
});

describe('header parsing', () => {
  it('strips the UTF-8 BOM the feed puts on the first column', () => {
    // Without this the first column is named "﻿trip_id", every lookup of
    // "trip_id" returns undefined, every row parses with an undefined id, and
    // nothing errors anywhere.
    const header = parseHeader('﻿trip_id,arrival_time,stop_id');
    expect(header.trip_id).toBe(0);
    expect(header.stop_id).toBe(2);
  });

  it('maps the real trips.txt header', () => {
    const header = parseHeader(
      '﻿route_id,service_id,trip_id,trip_headsign,trip_short_name,direction_id,block_id,original_trip_id,hints',
    );
    expect(header.trip_short_name).toBe(4);
    expect(header.original_trip_id).toBe(7);
  });
});

describe('GTFS times past midnight', () => {
  it('parses an ordinary time', () => {
    expect(gtfsTimeToDate('2026-09-08', '14:02:00')?.toISOString()).toBe(
      '2026-09-08T14:02:00.000Z',
    );
  });

  it('carries 25:30 into the NEXT day', () => {
    // A night train scheduled under the 8th departs at 01:30 on the 9th.
    // `new Date('2026-09-08T25:30:00')` is Invalid Date; a naive modulo puts
    // it 24 hours in the past, which is the difference between finding
    // someone's bag and telling them no such train ran.
    expect(gtfsTimeToDate('2026-09-08', '25:30:00')?.toISOString()).toBe(
      '2026-09-09T01:30:00.000Z',
    );
  });

  it('handles exactly 24:00:00', () => {
    expect(gtfsTimeToDate('2026-09-08', '24:00:00')?.toISOString()).toBe(
      '2026-09-09T00:00:00.000Z',
    );
  });

  it('rejects nonsense rather than inventing a time', () => {
    expect(gtfsTimeToDate('2026-09-08', '')).toBeNull();
    expect(gtfsTimeToDate('2026-09-08', 'noon')).toBeNull();
    expect(gtfsTimeToDate('2026-09-08', '10:75:00')).toBeNull();
    expect(gtfsTimeToDate('not-a-date', '10:00:00')).toBeNull();
  });
});

describe('date conversion', () => {
  it('converts the feed format', () => {
    expect(gtfsDateToIso('20260908')).toBe('2026-09-08');
  });

  it('rejects anything else', () => {
    expect(gtfsDateToIso('2026-09-08')).toBeNull();
    expect(gtfsDateToIso('')).toBeNull();
  });
});

describe('calendar coverage', () => {
  const weekdaysOnly = {
    serviceId: 'TA+wk',
    days: {
      monday: '1',
      tuesday: '1',
      wednesday: '1',
      thursday: '1',
      friday: '1',
      saturday: '0',
      sunday: '0',
    },
    startDate: '20251214',
    endDate: '20261212',
  };

  it('is active on a weekday inside the range', () => {
    // 2026-09-08 is a Tuesday.
    expect(calendarCovers(weekdaysOnly, '2026-09-08')).toBe(true);
  });

  it('is inactive at the weekend', () => {
    // 2026-09-12 is a Saturday.
    expect(calendarCovers(weekdaysOnly, '2026-09-12')).toBe(false);
  });

  it('is inactive outside the validity range', () => {
    expect(calendarCovers(weekdaysOnly, '2027-01-01')).toBe(false);
    expect(calendarCovers(weekdaysOnly, '2025-01-01')).toBe(false);
  });

  it('includes both endpoints of the range', () => {
    expect(calendarCovers({ ...weekdaysOnly, startDate: '20260908' }, '2026-09-08')).toBe(true);
    expect(calendarCovers({ ...weekdaysOnly, endDate: '20260908' }, '2026-09-08')).toBe(true);
  });

  it('maps weekday columns correctly across a whole week', () => {
    // The off-by-one that matters: getUTCDay is 0=Sunday, GTFS columns start
    // at monday. Getting this wrong shifts every service by a day and still
    // returns plausible trains.
    const sundayOnly = {
      ...weekdaysOnly,
      days: {
        monday: '0',
        tuesday: '0',
        wednesday: '0',
        thursday: '0',
        friday: '0',
        saturday: '0',
        sunday: '1',
      },
    };
    expect(calendarCovers(sundayOnly, '2026-09-13')).toBe(true); // Sunday
    expect(calendarCovers(sundayOnly, '2026-09-14')).toBe(false); // Monday
  });
});

describe('station identity', () => {
  it('picks the station row, not a platform', () => {
    // Every row for Zürich HB carries didok 8503000; the station's own row is
    // the shortest stop_id among them.
    expect(pickStationId(['ch:1:sloid:3000:2:3', 'ch:1:sloid:3000', 'ch:1:sloid:3000:10:18'])).toBe(
      'ch:1:sloid:3000',
    );
  });

  it('is deterministic when two ids are the same length', () => {
    expect(pickStationId(['ch:1:sloid:b', 'ch:1:sloid:a'])).toBe('ch:1:sloid:a');
  });

  it('returns null for nothing', () => {
    expect(pickStationId([])).toBeNull();
  });
});
