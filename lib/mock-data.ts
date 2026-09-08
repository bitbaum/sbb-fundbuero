/**
 * Mock Data for Demo Mode
 * Realistic Swiss public transport data for demonstration
 */

import { tenant } from '@/lib/tenant';
import { UI_LABELS } from './labels';
import type {
  Trip,
  LostItem,
  User,
  Vehicle,
  Station,
  StaffMember,
  StaffNotification,
} from './types';

// ============================================================================
// Mock User
// ============================================================================

export const mockUser: User = {
  id: 'user-001',
  email: 'anna.mueller@example.ch',
  name: 'Anna Müller',
  phone: '+41 79 123 45 67',
  swissPassId: 'SP-2024-001234',
  language: 'de',
};

// ============================================================================
// Mock Stations (Real Swiss stations)
// ============================================================================

export const stations: Record<string, Station> = {
  zurichHB: { id: 'st-001', name: 'Zürich HB', code: 'ZUE' },
  zurichOerlikon: { id: 'st-002', name: 'Zürich Oerlikon', code: 'ZOL' },
  zurichStadelhofen: { id: 'st-003', name: 'Zürich Stadelhofen', code: 'ZST' },
  zurichAltstetten: { id: 'st-004', name: 'Zürich Altstetten', code: 'ZAL' },
  bern: { id: 'st-005', name: 'Bern', code: 'BN' },
  basel: { id: 'st-006', name: 'Basel SBB', code: 'BS' },
  geneve: { id: 'st-007', name: 'Genève', code: 'GE' },
  luzern: { id: 'st-008', name: 'Luzern', code: 'LZ' },
  winterthur: { id: 'st-009', name: 'Winterthur', code: 'WIN' },
  stGallen: { id: 'st-010', name: 'St. Gallen', code: 'SG' },
  paradeplatz: { id: 'st-011', name: 'Paradeplatz' },
  central: { id: 'st-012', name: 'Central' },
  bellevue: { id: 'st-013', name: 'Bellevue' },
  bucheggplatz: { id: 'st-014', name: 'Bucheggplatz' },
};

// ============================================================================
// Mock Vehicles
// ============================================================================

export const vehicles: Record<string, Vehicle> = {
  ic1: {
    id: 'v-001',
    type: 'train',
    line: 'IC 1',
    number: 'IC 723',
    operator: tenant.operatorCode,
  },
  ic8: {
    id: 'v-002',
    type: 'train',
    line: 'IC 8',
    number: 'IC 812',
    operator: tenant.operatorCode,
  },
  s3: { id: 'v-003', type: 'train', line: 'S3', number: 'S3 18234', operator: tenant.operatorCode },
  s8: { id: 'v-004', type: 'train', line: 'S8', number: 'S8 18456', operator: tenant.operatorCode },
  tram4: { id: 'v-005', type: 'tram', line: 'Tram 4', number: '2047', operator: 'VBZ' },
  tram11: { id: 'v-006', type: 'tram', line: 'Tram 11', number: '2103', operator: 'VBZ' },
  bus31: { id: 'v-007', type: 'bus', line: 'Bus 31', number: '704', operator: 'VBZ' },
};

// ============================================================================
// Mock Trips (Recent journeys for demo user)
// ============================================================================

const now = new Date();
const today = now.toISOString().split('T')[0];

function hoursAgo(hours: number): string {
  const d = new Date(now.getTime() - hours * 60 * 60 * 1000);
  return d.toISOString();
}

function minutesAgo(minutes: number): string {
  const d = new Date(now.getTime() - minutes * 60 * 1000);
  return d.toISOString();
}

export const mockTrips: Trip[] = [
  // Current/recent trip (within instant alert window)
  {
    id: 'trip-001',
    vehicle: vehicles.ic1,
    origin: stations.zurichHB,
    destination: stations.bern,
    departureTime: minutesAgo(45),
    arrivalTime: minutesAgo(5),
    car: '7',
    seat: '42A',
    platform: '3',
    status: 'completed',
  },
  // Earlier today
  {
    id: 'trip-002',
    vehicle: vehicles.tram4,
    origin: stations.central,
    destination: stations.bellevue,
    departureTime: hoursAgo(3),
    arrivalTime: hoursAgo(2.75),
    status: 'completed',
  },
  // This morning
  {
    id: 'trip-003',
    vehicle: vehicles.s3,
    origin: stations.winterthur,
    destination: stations.zurichHB,
    departureTime: hoursAgo(8),
    arrivalTime: hoursAgo(7.5),
    car: '3',
    platform: '8',
    status: 'completed',
  },
  // Yesterday
  {
    id: 'trip-004',
    vehicle: vehicles.ic8,
    origin: stations.zurichHB,
    destination: stations.basel,
    departureTime: hoursAgo(28),
    arrivalTime: hoursAgo(27),
    car: '12',
    seat: '15B',
    platform: '6',
    status: 'completed',
  },
  // Yesterday evening
  {
    id: 'trip-005',
    vehicle: vehicles.tram11,
    origin: stations.paradeplatz,
    destination: stations.bucheggplatz,
    departureTime: hoursAgo(26),
    arrivalTime: hoursAgo(25.5),
    status: 'completed',
  },
];

// ============================================================================
// Mock Current Trip (active journey)
// ============================================================================

export const mockCurrentTrip: Trip | null = null; // No active trip for demo

// Alternative: Active trip for testing
export const mockActiveTrip: Trip = {
  id: 'trip-active',
  vehicle: vehicles.ic1,
  origin: stations.zurichHB,
  destination: stations.bern,
  departureTime: minutesAgo(20),
  arrivalTime: new Date(now.getTime() + 40 * 60 * 1000).toISOString(),
  car: '7',
  seat: '42A',
  platform: '3',
  status: 'active',
};

// ============================================================================
// Mock Lost Items (User's previous reports)
// ============================================================================

export const mockLostItems: LostItem[] = [
  {
    id: 'lost-001',
    userId: mockUser.id,
    tripId: 'trip-004',
    category: 'electronics',
    description: 'Schwarzes iPhone 14 mit blauer Hülle',
    color: 'schwarz',
    location: 'seat',
    status: 'returned',
    createdAt: hoursAgo(27),
    updatedAt: hoursAgo(24),
    statusHistory: [
      {
        id: 'sh-001',
        lostItemId: 'lost-001',
        status: 'reported',
        createdAt: hoursAgo(27),
        updatedBy: 'user',
      },
      {
        id: 'sh-002',
        lostItemId: 'lost-001',
        status: 'searching',
        message: 'Zugpersonal wurde benachrichtigt',
        createdAt: hoursAgo(26.9),
        updatedBy: 'system',
      },
      {
        id: 'sh-003',
        lostItemId: 'lost-001',
        status: 'found',
        message: 'Gefunden bei Platz 15B, Wagen 12',
        createdAt: hoursAgo(26),
        updatedBy: 'driver',
      },
      {
        id: 'sh-004',
        lostItemId: 'lost-001',
        status: 'returned',
        message: 'Abgeholt am Fundbüro Basel SBB',
        createdAt: hoursAgo(24),
        updatedBy: 'staff',
      },
    ],
  },
];

// ============================================================================
// Demo Simulation Helpers
// ============================================================================

/**
 * Simulate driver finding an item after a delay
 */
export function simulateDriverResponse(
  onSearching: () => void,
  onFound: () => void,
  delayMs = 5000,
): () => void {
  const searchingTimeout = setTimeout(onSearching, 1500);
  const foundTimeout = setTimeout(onFound, delayMs);

  return () => {
    clearTimeout(searchingTimeout);
    clearTimeout(foundTimeout);
  };
}

/**
 * Calculate time since trip ended for urgency display
 */
export function getTimeSinceTrip(arrivalTime: string): {
  minutes: number;
  isUrgent: boolean;
  isPriority: boolean;
} {
  const arrival = new Date(arrivalTime);
  const minutes = Math.floor((Date.now() - arrival.getTime()) / 60000);

  return {
    minutes,
    isUrgent: minutes <= 30,
    isPriority: minutes <= 120,
  };
}

/**
 * Format time for display
 */
export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;

  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
}

// ============================================================================
// Staff Mock Data (operator employees)
// ============================================================================

export const mockStaff: StaffMember = {
  id: 'staff-001',
  name: 'Marco Brunner',
  employeeNumber: `${tenant.operatorCode}-7842`,
  role: 'conductor',
  vehicleId: 'v-001',
  isOnDuty: true,
};

/** @deprecated Use mockStaff instead */
export const mockDriver = mockStaff;

export const mockVehicle: Vehicle = {
  id: 'v-001',
  type: 'train',
  line: 'IC 1',
  number: 'IC 723',
  operator: tenant.operatorCode,
};

// ============================================================================
// Staff Notifications Mock Data
// ============================================================================

/**
 * The report the crew view stages for a visitor who opens /staff on its own,
 * so the arrival moment — the thing this product is about — is visible without
 * a second device. A real report handed over from the passenger view takes
 * precedence over it (see lib/demo-bus.ts and app/staff/page.tsx).
 *
 * Built fresh per call so its timestamp reads as "gerade eben", and derived
 * from mockActiveTrip so the seat and route cannot drift from the trip the
 * passenger view actually shows.
 */
export function createDemoIncomingNotification(): StaffNotification {
  const seat = `${UI_LABELS.trip.car} ${mockActiveTrip.car}, ${UI_LABELS.trip.seat} ${mockActiveTrip.seat}`;
  return {
    id: `notif-demo-${Date.now()}`,
    lostItemId: 'lost-demo',
    staffId: mockStaff.id,
    vehicleId: mockActiveTrip.vehicle.id,
    status: 'pending',
    message: 'Schwarze Laptop-Tasche',
    priority: 'urgent',
    location: seat,
    category: 'bags',
    createdAt: new Date().toISOString(),
    passengerInfo: {
      tripRoute: `${mockActiveTrip.origin.name} → ${mockActiveTrip.destination.name}`,
      tripTime: formatTime(mockActiveTrip.departureTime),
      seatInfo: seat,
    },
  };
}

export const mockStaffNotifications: StaffNotification[] = [
  {
    id: 'notif-001',
    lostItemId: 'lost-001',
    staffId: mockStaff.id,
    vehicleId: mockVehicle.id,
    status: 'pending',
    message: 'Blaue Wasserflasche (Sigg)',
    priority: 'normal',
    location: 'Wagen 3, bei Sitzplatz 22',
    category: 'other',
    createdAt: minutesAgo(8),
    passengerInfo: {
      tripRoute: 'Zürich HB → Winterthur',
      tripTime: '09:45',
      seatInfo: 'Wagen 3, Platz 22',
    },
  },
  {
    id: 'notif-002',
    lostItemId: 'lost-002',
    staffId: mockStaff.id,
    vehicleId: mockVehicle.id,
    status: 'found',
    message: 'Schwarzer Regenschirm (Knirps)',
    priority: 'normal',
    location: 'Wagen 5, Gepäckablage',
    category: 'umbrella',
    createdAt: hoursAgo(2),
    acknowledgedAt: hoursAgo(1.9),
    respondedAt: hoursAgo(1.5),
    response: {
      notes: 'Gefunden bei der Gepäckablage, Wagen 5. Liegt bereit für Abholung.',
      foundItem: true,
    },
    passengerInfo: {
      tripRoute: 'Bern → Zürich HB',
      tripTime: '08:12',
      seatInfo: 'Wagen 5',
    },
  },
  {
    id: 'notif-003',
    lostItemId: 'lost-003',
    staffId: mockStaff.id,
    vehicleId: mockVehicle.id,
    status: 'not_found',
    message: 'AirPods Pro Ladecase (weiss)',
    priority: 'urgent',
    location: 'Wagen 7, unter Sitz 45',
    category: 'electronics',
    createdAt: hoursAgo(4),
    acknowledgedAt: hoursAgo(3.9),
    respondedAt: hoursAgo(3),
    response: {
      notes: 'Gründlich gesucht, leider nicht gefunden. Wurde an Fundbüro weitergeleitet.',
      foundItem: false,
    },
    passengerInfo: {
      tripRoute: 'St. Gallen → Zürich HB',
      tripTime: '06:30',
      seatInfo: 'Wagen 7, Platz 45',
    },
  },
];
