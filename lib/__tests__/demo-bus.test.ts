/**
 * The demo hand-off carries the passenger's actual report to the crew view.
 * These cover the two halves that can silently lie: the mapping from report to
 * notification (wrong seat or wrong urgency reads as a working demo) and the
 * parser (storage is shared, long-lived, and therefore untrusted input).
 */

import { answerReport, notificationFromReport, parseReports } from '../demo-bus';
import { config } from '../config';
import { mockActiveTrip, mockTrips } from '../mock-data';
import type { LostItem, StaffNotification, Trip } from '../types';

/** Fixed so an answer's timestamp is asserted, not merely present. */
const STAMP = '2026-09-01T09:00:00.000Z';

function report(overrides: Partial<LostItem> = {}): LostItem {
  return {
    id: 'lost-test-1',
    userId: 'user-001',
    tripId: mockActiveTrip.id,
    category: 'bags',
    description: 'Roter Rucksack mit Laptop',
    location: 'overhead',
    status: 'reported',
    createdAt: '2026-09-01T08:30:00.000Z',
    updatedAt: '2026-09-01T08:30:00.000Z',
    ...overrides,
  };
}

function tripArrivedMinutesAgo(minutes: number): Trip {
  return {
    ...mockActiveTrip,
    arrivalTime: new Date(Date.now() - minutes * 60_000).toISOString(),
  };
}

describe('notificationFromReport', () => {
  it('carries the passenger’s own description, seat and route to the crew', () => {
    const notification = notificationFromReport(report(), mockActiveTrip);

    expect(notification.message).toBe('Roter Rucksack mit Laptop');
    expect(notification.location).toBe(
      `Wagen ${mockActiveTrip.car}, Platz ${mockActiveTrip.seat} • Gepäckablage`,
    );
    expect(notification.passengerInfo?.tripRoute).toBe(
      `${mockActiveTrip.origin.name} → ${mockActiveTrip.destination.name}`,
    );
    expect(notification.category).toBe('bags');
    expect(notification.status).toBe('pending');
    expect(notification.lostItemId).toBe('lost-test-1');
  });

  it('routes the notification to the vehicle the passenger was actually on', () => {
    const otherTrip = mockTrips.find((t) => t.vehicle.id !== mockActiveTrip.vehicle.id);
    expect(otherTrip).toBeDefined();

    expect(notificationFromReport(report(), otherTrip as Trip).vehicleId).toBe(
      (otherTrip as Trip).vehicle.id,
    );
  });

  it('is urgent inside the instant-alert window and normal outside it', () => {
    const inside = config.reporting.instantAlertWindowMinutes - 1;
    const outside = config.reporting.instantAlertWindowMinutes + 1;

    expect(notificationFromReport(report(), tripArrivedMinutesAgo(inside)).priority).toBe('urgent');
    expect(notificationFromReport(report(), tripArrivedMinutesAgo(outside)).priority).toBe(
      'normal',
    );
  });

  it('treats a trip that has not arrived yet as urgent — the item is still on board', () => {
    expect(notificationFromReport(report(), tripArrivedMinutesAgo(-20)).priority).toBe('urgent');
  });

  it('falls back to the location label when the trip has no seat reservation', () => {
    const noSeat: Trip = { ...mockActiveTrip, car: undefined, seat: undefined };

    expect(notificationFromReport(report({ location: 'bathroom' }), noSeat).location).toBe(
      'WC-Bereich',
    );
  });
});

describe('parseReports', () => {
  it('reads back what was written', () => {
    const notification = notificationFromReport(report(), mockActiveTrip);

    expect(parseReports(JSON.stringify([notification]))).toEqual([notification]);
  });

  it('yields nothing for empty, malformed or non-array storage', () => {
    expect(parseReports(null)).toEqual([]);
    expect(parseReports('')).toEqual([]);
    expect(parseReports('{ not json')).toEqual([]);
    expect(parseReports('{"id":"notif-1"}')).toEqual([]);
  });

  it('drops entries that are not usable notifications instead of rendering them', () => {
    const good = notificationFromReport(report(), mockActiveTrip);
    const raw = JSON.stringify([good, null, 'notif-2', { id: 'notif-3' }, { message: 'no id' }]);

    const parsed: StaffNotification[] = parseReports(raw);
    expect(parsed).toEqual([good]);
  });
});

describe('answerReport', () => {
  const reports = [
    notificationFromReport(report({ id: 'lost-a' }), mockActiveTrip),
    notificationFromReport(report({ id: 'lost-b' }), mockActiveTrip),
  ];

  it('writes the crew’s answer onto the notification it answers', () => {
    const answered = answerReport(reports, 'notif-lost-a', 'found', 'lag in der Ablage', STAMP);

    expect(answered[0]).toMatchObject({
      id: 'notif-lost-a',
      status: 'found',
      respondedAt: STAMP,
      response: { notes: 'lag in der Ablage', foundItem: true },
    });
  });

  it('leaves every other report untouched', () => {
    const answered = answerReport(reports, 'notif-lost-a', 'not_found', undefined, STAMP);

    expect(answered[1]).toEqual(reports[1]);
    expect(answered[1].respondedAt).toBeUndefined();
  });

  it('records a not-found answer as such, without inventing a note', () => {
    const [first] = answerReport(reports, 'notif-lost-a', 'not_found', undefined, STAMP);

    expect(first.status).toBe('not_found');
    expect(first.response).toBeUndefined();
  });

  it('changes nothing when the id is not one of ours', () => {
    expect(answerReport(reports, 'notif-someone-else', 'found', undefined, STAMP)).toEqual(reports);
  });
});
