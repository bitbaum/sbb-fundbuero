/**
 * Seed a working local system.
 *
 * `docker compose up -d && pnpm run db:setup && pnpm run db:seed` has to leave
 * someone else with something they can actually click through. That is a
 * definition-of-done item, not a convenience.
 *
 * EVERYTHING THIS WRITES IS A FIXTURE, and it is labelled as one: every
 * reference starts with `DEMO-`, and the stops and journeys carry a `demo:`
 * identifier prefix rather than a real SLOID or SJYID. Two reasons, both
 * learned the hard way elsewhere in this fleet:
 *
 *   - demo rows that look real get counted in real numbers
 *   - a fixture wearing a real identifier is indistinguishable from imported
 *     data the moment anyone looks at the table
 *
 * The journeys below are shaped like real Swiss services but are NOT imported
 * from open data. Real journeys arrive through the importer; this is a
 * stand-in so the app is usable before a 248 MB GTFS download.
 */

import { sql } from 'drizzle-orm';

import { db, schema } from '../db/client';
import { parseIdentifier } from '../lib/domain/identifiers';
import { foundItemRetention, reportRetention } from '../lib/domain/retention';
import { tokenise } from '../lib/domain/tokenise';

const DEMO_PREFIX = 'DEMO-';

/** Fixed so re-seeding is idempotent and diffs are readable. */
const TODAY = new Date();
const OPERATING_DATE = TODAY.toISOString().slice(0, 10);

function at(hour: number, minute: number): Date {
  const d = new Date(TODAY);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  const database = db();

  console.log('→ clearing previous demo rows');
  // Only demo rows. A seed that truncates would be a foot-gun the first time
  // anyone points DATABASE_URL at something that matters.
  await database.execute(
    sql`DELETE FROM identifiers WHERE report_id IN (SELECT id FROM reports WHERE reference LIKE ${DEMO_PREFIX + '%'})`,
  );
  await database.execute(
    sql`DELETE FROM identifiers WHERE found_item_id IN (SELECT id FROM found_items WHERE reference LIKE ${DEMO_PREFIX + '%'})`,
  );
  await database.execute(sql`DELETE FROM reports WHERE reference LIKE ${DEMO_PREFIX + '%'}`);
  await database.execute(sql`DELETE FROM found_items WHERE reference LIKE ${DEMO_PREFIX + '%'}`);
  await database.execute(sql`DELETE FROM journeys WHERE sjyid LIKE ${'demo:%'}`);
  await database.execute(sql`DELETE FROM stops WHERE id LIKE ${'demo:%'}`);
  await database.execute(sql`DELETE FROM contacts WHERE email LIKE ${'%@example.invalid'}`);

  console.log('→ stops (fixtures, not the real service-point registry)');
  const stops = [
    {
      id: 'demo:stop:zurich-hb',
      uic: 8503000,
      name: 'Zürich HB',
      lat: '47.378177',
      lon: '8.540192',
    },
    { id: 'demo:stop:bern', uic: 8507000, name: 'Bern', lat: '46.948832', lon: '7.439136' },
    { id: 'demo:stop:lausanne', uic: 8501120, name: 'Lausanne', lat: '46.516777', lon: '6.629095' },
    {
      id: 'demo:stop:winterthur',
      uic: 8506000,
      name: 'Winterthur',
      lat: '47.500499',
      lon: '8.723852',
    },
  ];
  await database.insert(schema.stops).values(stops).onConflictDoNothing();

  console.log('→ journeys (fixtures — real ones come from the GTFS importer)');
  const journeyRows = [
    {
      sjyid: `demo:sjyid:ic1-701:${OPERATING_DATE}`,
      operatingDate: OPERATING_DATE,
      trainNumber: '701',
      line: 'IC 1',
      operatorCode: 'DEMO',
      originStopId: 'demo:stop:zurich-hb',
      destinationStopId: 'demo:stop:lausanne',
      departureAt: at(14, 2),
      arrivalAt: at(16, 12),
    },
    {
      sjyid: `demo:sjyid:ic1-703:${OPERATING_DATE}`,
      operatingDate: OPERATING_DATE,
      trainNumber: '703',
      line: 'IC 1',
      operatorCode: 'DEMO',
      originStopId: 'demo:stop:zurich-hb',
      destinationStopId: 'demo:stop:lausanne',
      departureAt: at(15, 2),
      arrivalAt: at(17, 12),
    },
    {
      sjyid: `demo:sjyid:s12-8842:${OPERATING_DATE}`,
      operatingDate: OPERATING_DATE,
      trainNumber: '8842',
      line: 'S12',
      operatorCode: 'DEMO',
      originStopId: 'demo:stop:winterthur',
      destinationStopId: 'demo:stop:zurich-hb',
      departureAt: at(14, 18),
      arrivalAt: at(14, 48),
    },
  ];
  const journeys = await database.insert(schema.journeys).values(journeyRows).returning();
  const ic1 = journeys.find((j) => j.trainNumber === '701')!;

  console.log('→ journey calls, so "here, around then" can find a train');
  await database.insert(schema.journeyCalls).values(
    journeys.flatMap((j) => [
      { journeyId: j.id, stopId: j.originStopId!, sequence: 1, departureAt: j.departureAt },
      {
        journeyId: j.id,
        stopId: 'demo:stop:bern',
        sequence: 2,
        arrivalAt: j.departureAt,
        departureAt: j.departureAt,
      },
      { journeyId: j.id, stopId: j.destinationStopId!, sequence: 3, arrivalAt: j.arrivalAt },
    ]),
  );

  console.log('→ a contact');
  const [contact] = await database
    .insert(schema.contacts)
    .values({
      email: 'demo.passenger@example.invalid',
      locale: 'de',
      deleteAfter: reportRetention(TODAY, null).deleteAfter,
    })
    .returning();

  console.log('→ a loss report bound to a journey, with an identifier');
  const lostDescription = 'Schwarzes Handy mit gesprungener Ecke, in der Gepäckablage';
  const [report] = await database
    .insert(schema.reports)
    .values({
      reference: `${DEMO_PREFIX}R-0001`,
      contactId: contact.id,
      journeyId: ic1.id,
      coach: '7',
      seat: '42',
      area: 'overhead',
      lostFrom: at(14, 5),
      lostTo: at(14, 35),
      category: 'electronics',
      description: lostDescription,
      descriptionTokens: tokenise(lostDescription),
      colour: 'schwarz',
      brand: 'Fairphone',
      state: 'submitted',
      locale: 'de',
      deleteAfter: reportRetention(TODAY, null).deleteAfter,
    })
    .returning();

  // A Luhn-valid IMEI, so `verified` is earned rather than asserted.
  const imei = parseIdentifier('imei', '49 015420 323751 8');
  if (!imei) throw new Error('seed IMEI failed its own checksum — fix the fixture');
  await database.insert(schema.identifiers).values({
    reportId: report.id,
    kind: imei.kind,
    value: imei.value,
    valueDisplay: '49 015420 323751 8',
    verified: imei.verified ?? false,
  });

  console.log('→ a found item on the same journey, carrying the same IMEI');
  const foundDescription = 'Mobiltelefon, dunkel, Displayecke beschädigt';
  const retention = foundItemRetention(TODAY, 300);
  const [found] = await database
    .insert(schema.foundItems)
    .values({
      reference: `${DEMO_PREFIX}F-0001`,
      journeyId: ic1.id,
      coach: '7',
      area: 'overhead',
      foundAt: at(14, 40),
      foundBy: 'demo-crew-1',
      custodyLocation: 'Demo-Fundstelle',
      category: 'electronics',
      description: foundDescription,
      descriptionTokens: tokenise(foundDescription),
      colour: 'schwarz',
      estimatedValueChf: '300.00',
      state: 'in_custody',
      disposalEligibleAt: retention.disposalEligibleAt,
      deleteAfter: retention.deleteAfter,
    })
    .returning();

  await database.insert(schema.identifiers).values({
    foundItemId: found.id,
    kind: imei.kind,
    value: imei.value,
    valueDisplay: '490154203237518',
    verified: true,
  });

  console.log('→ a second found item that matches only on description');
  // Present so the demo shows the ordering working: this one must rank BELOW
  // the IMEI match no matter how similar the words are.
  const decoy = 'Schwarzes Handy, Ecke gesprungen, Gepäckablage';
  const decoyRetention = foundItemRetention(TODAY, 300);
  await database.insert(schema.foundItems).values({
    reference: `${DEMO_PREFIX}F-0002`,
    journeyId: null,
    foundAt: at(15, 10),
    foundBy: 'demo-crew-2',
    custodyLocation: 'Demo-Fundstelle',
    category: 'electronics',
    description: decoy,
    descriptionTokens: tokenise(decoy),
    colour: 'schwarz',
    brand: 'Fairphone',
    estimatedValueChf: '300.00',
    state: 'in_custody',
    disposalEligibleAt: decoyRetention.disposalEligibleAt,
    deleteAfter: decoyRetention.deleteAfter,
  });

  console.log('');
  console.log('✓ seeded. Every row is a fixture:');
  console.log(`    references prefixed ${DEMO_PREFIX}, stops and journeys prefixed demo:`);
  console.log('    DEMO-F-0001 shares an IMEI with DEMO-R-0001 and must outrank');
  console.log('    DEMO-F-0002, which agrees only on words.');

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
