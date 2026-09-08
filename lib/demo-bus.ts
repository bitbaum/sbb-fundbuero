/**
 * Demo hand-off between the passenger view and the staff view.
 *
 * With a backend, a report POSTed to the reporting service is fanned out to the
 * crew by the notification service over its websocket. No backend is deployed
 * alongside this build (`config.demo.enabled`), and the staff view covered for
 * that with a notification hardcoded into the page on a 5s timer: whatever a
 * visitor reported on `/`, the crew saw "Schwarze Laptop-Tasche". The one claim
 * this demo exists to make — the crew hears about the item while it is still on
 * board — was exactly the part that was faked.
 *
 * This is the smallest honest stand-in for that hop: same-origin localStorage
 * carries the report, and the `storage` event delivers it to the other tab,
 * which is how the demo is shown (passenger on one screen, crew on another).
 * Everything here is inert when a backend is configured — see `publishReport`.
 *
 * It carries the crew's answer back the same way. One key, one shape: the
 * answer is written onto the notification it answers, so there is no second
 * type and no second copy of the same fact to drift.
 */

import { config } from './config';
import { ITEM_LOCATION_CONFIG } from './types';
import type {
  LostItem,
  StaffNotification,
  NotificationPriority,
  NotificationStatus,
  Trip,
} from './types';
import { UI_LABELS } from './labels';
import { mockStaff } from './mock-data';

/** Fired on the reporting tab itself; `storage` only reaches *other* tabs. */
const SAME_TAB_EVENT = 'demo-report-published';

/**
 * Where the report reaches the crew: the seat the passenger sat in, plus where
 * in the vehicle they think the item is. That pair is what makes a search
 * possible, so it is what the card leads with.
 */
function describeLocation(item: LostItem, trip: Trip): string {
  const seat = trip.car
    ? `${UI_LABELS.trip.car} ${trip.car}${trip.seat ? `, ${UI_LABELS.trip.seat} ${trip.seat}` : ''}`
    : null;
  const where = ITEM_LOCATION_CONFIG[item.location].labelDe;
  return seat ? `${seat} • ${where}` : where;
}

/**
 * Urgency is a function of how long ago the trip ended — the whole premise of
 * the product. The threshold comes from `config.reporting`, never a literal.
 * A trip that has not arrived yet gives a negative age, which is the most
 * urgent case there is: the item is still on board.
 */
function derivePriority(trip: Trip): NotificationPriority {
  const minutesSinceArrival = (Date.now() - new Date(trip.arrivalTime).getTime()) / 60000;
  return minutesSinceArrival <= config.reporting.instantAlertWindowMinutes ? 'urgent' : 'normal';
}

/**
 * The shape the notification service would build server-side. Pure, so the
 * mapping is testable without a browser.
 */
export function notificationFromReport(item: LostItem, trip: Trip): StaffNotification {
  return {
    id: `notif-${item.id}`,
    lostItemId: item.id,
    staffId: mockStaff.id,
    vehicleId: trip.vehicle.id,
    status: 'pending',
    message: item.description,
    priority: derivePriority(trip),
    location: describeLocation(item, trip),
    category: item.category,
    createdAt: item.createdAt,
    passengerInfo: {
      tripRoute: `${trip.origin.name} → ${trip.destination.name}`,
      tripTime: new Date(trip.departureTime).toLocaleTimeString('de-CH', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      seatInfo: trip.car
        ? `${UI_LABELS.trip.car} ${trip.car}${trip.seat ? `, ${UI_LABELS.trip.seat} ${trip.seat}` : ''}`
        : undefined,
    },
  };
}

/**
 * Storage is shared with every other page on this origin and survives across
 * builds, so anything in it is untrusted input: parse defensively and drop the
 * lot rather than render half-typed objects.
 */
export function parseReports(raw: string | null): StaffNotification[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is StaffNotification =>
        typeof n === 'object' &&
        n !== null &&
        typeof (n as StaffNotification).id === 'string' &&
        typeof (n as StaffNotification).message === 'string',
    );
  } catch {
    return [];
  }
}

function store(): Storage | null {
  // Server render and privacy modes that throw on access both land here.
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readReports(): StaffNotification[] {
  const s = store();
  return s ? parseReports(s.getItem(config.demo.handoffKey)) : [];
}

/**
 * Hands a submitted report to the crew view.
 *
 * Call this only for a report the backend did NOT take — the caller is the one
 * that knows. When the reporting service accepted it, the notification service
 * owns this hop, and a copy written here would put the same report on the crew
 * screen twice under two different ids. Note that `config.demo.enabled` is the
 * wrong gate for that: it is false whenever an API URL is merely *configured*,
 * including in dev against a backend that is not running — precisely the case
 * where the fallback has to work.
 */
export function publishReport(item: LostItem, trip: Trip): void {
  const s = store();
  if (!s) return;

  const next = [notificationFromReport(item, trip), ...readReports()].slice(
    0,
    config.demo.handoffLimit,
  );

  try {
    s.setItem(config.demo.handoffKey, JSON.stringify(next));
  } catch {
    // Quota or a locked-down browser: the demo degrades to the mock list.
    return;
  }
  window.dispatchEvent(new CustomEvent(SAME_TAB_EVENT));
}

/**
 * The crew's answer, written onto the notification it answers. Pure, so the
 * part that can silently drop an answer is testable without a browser.
 */
export function answerReport(
  reports: StaffNotification[],
  notificationId: string,
  status: Extract<NotificationStatus, 'found' | 'not_found'>,
  notes?: string,
  respondedAt: string = new Date().toISOString(),
): StaffNotification[] {
  return reports.map((n) =>
    n.id === notificationId
      ? {
          ...n,
          status,
          respondedAt,
          response: notes ? { notes, foundItem: status === 'found' } : undefined,
        }
      : n,
  );
}

/**
 * Sends the crew's answer back to the passenger view. Same rule as
 * `publishReport`: only for a notification this browser handed over, never for
 * one the backend owns — there the answer travels back the way it came.
 */
export function publishResponse(
  notificationId: string,
  status: Extract<NotificationStatus, 'found' | 'not_found'>,
  notes?: string,
): void {
  const s = store();
  if (!s) return;

  const reports = readReports();
  if (!reports.some((n) => n.id === notificationId)) return;

  try {
    s.setItem(
      config.demo.handoffKey,
      JSON.stringify(answerReport(reports, notificationId, status, notes)),
    );
  } catch {
    // Quota or a locked-down browser: the crew view keeps its local answer.
    return;
  }
  window.dispatchEvent(new CustomEvent(SAME_TAB_EVENT));
}

/**
 * Calls back with the full report list whenever it changes — in this tab and in
 * any other tab on this origin. Returns the unsubscribe.
 */
export function subscribeReports(onChange: (reports: StaffNotification[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== config.demo.handoffKey) return;
    onChange(readReports());
  };
  const handleSameTab = () => onChange(readReports());

  window.addEventListener('storage', handleStorage);
  window.addEventListener(SAME_TAB_EVENT, handleSameTab);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(SAME_TAB_EVENT, handleSameTab);
  };
}
