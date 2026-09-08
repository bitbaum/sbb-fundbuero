/**
 * Fundbüro — TypeScript type definitions
 * Single Source of Truth for all data types
 */

// ============================================================================
// Trip & Vehicle Types
// ============================================================================

export interface Vehicle {
  id: string;
  type: 'train' | 'tram' | 'bus';
  line: string; // e.g., "IC 1", "S3", "Tram 4"
  number: string; // e.g., "IC 123", "S3 12345"
  /**
   * Operator code as shown in vehicle data. Deliberately a free string, not
   * a union: the app is white-label, so valid operators are deployment data
   * and cannot be enumerated in the type system. See lib/tenant.ts.
   */
  operator: string;
}

export interface Station {
  id: string;
  name: string; // e.g., "Zürich HB"
  code?: string; // e.g., "ZUE"
}

export interface Trip {
  id: string;
  vehicle: Vehicle;
  origin: Station;
  destination: Station;
  departureTime: string; // ISO 8601
  arrivalTime: string; // ISO 8601
  car?: string; // e.g., "7"
  seat?: string; // e.g., "42A"
  platform?: string; // e.g., "3"
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
}

// ============================================================================
// Lost Item Types
// ============================================================================

export const ITEM_CATEGORIES = [
  'electronics',
  'bags',
  'clothing',
  'documents',
  'keys',
  'wallet',
  'glasses',
  'umbrella',
  'other',
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const ITEM_CATEGORY_CONFIG: Record<
  ItemCategory,
  { label: string; labelDe: string; icon: string }
> = {
  electronics: { label: 'Electronics', labelDe: 'Elektronik', icon: '📱' },
  bags: { label: 'Bags', labelDe: 'Taschen', icon: '🎒' },
  clothing: { label: 'Clothing', labelDe: 'Kleidung', icon: '👕' },
  documents: { label: 'Documents', labelDe: 'Dokumente', icon: '📄' },
  keys: { label: 'Keys', labelDe: 'Schlüssel', icon: '🔑' },
  wallet: { label: 'Wallet', labelDe: 'Geldbörse', icon: '👛' },
  glasses: { label: 'Glasses', labelDe: 'Brille', icon: '👓' },
  umbrella: { label: 'Umbrella', labelDe: 'Regenschirm', icon: '☂️' },
  other: { label: 'Other', labelDe: 'Sonstiges', icon: '❓' },
};

export const ITEM_LOCATIONS = [
  'seat',
  'table',
  'overhead',
  'floor',
  'bathroom',
  'entrance',
  'unknown',
] as const;

export type ItemLocation = (typeof ITEM_LOCATIONS)[number];

export const ITEM_LOCATION_CONFIG: Record<ItemLocation, { label: string; labelDe: string }> = {
  seat: { label: 'At my seat', labelDe: 'Bei meinem Sitzplatz' },
  table: { label: 'On the table', labelDe: 'Auf dem Tisch' },
  overhead: { label: 'Overhead compartment', labelDe: 'Gepäckablage' },
  floor: { label: 'On the floor', labelDe: 'Auf dem Boden' },
  bathroom: { label: 'Bathroom area', labelDe: 'WC-Bereich' },
  entrance: { label: 'Near entrance', labelDe: 'Beim Eingang' },
  unknown: { label: 'Not sure', labelDe: 'Nicht sicher' },
};

export type LostItemStatus =
  | 'reported' // Initial report
  | 'searching' // Driver/staff notified, actively looking
  | 'found' // Item located
  | 'not_found' // Search completed, not found
  | 'returned' // Returned to owner
  | 'in_depot' // At lost & found office
  | 'closed'; // Case closed

export interface LostItem {
  id: string;
  userId: string;
  tripId: string;
  category: ItemCategory;
  description: string;
  color?: string;
  location: ItemLocation;
  locationDetail?: string;
  imageUrl?: string;
  status: LostItemStatus;
  createdAt: string;
  updatedAt: string;

  // Relationships
  trip?: Trip;
  statusHistory?: StatusUpdate[];
}

export interface StatusUpdate {
  id: string;
  lostItemId: string;
  status: LostItemStatus;
  message?: string;
  updatedBy: 'system' | 'driver' | 'staff' | 'user';
  createdAt: string;
}

// ============================================================================
// Found Item Types (for driver/staff)
// ============================================================================

export interface FoundItem {
  id: string;
  vehicleId: string;
  category: ItemCategory;
  description: string;
  color?: string;
  location: string;
  imageUrl?: string;
  foundBy: string; // Staff/driver ID
  foundAt: string; // ISO 8601
  status: 'reported' | 'matched' | 'returned' | 'in_depot';
  matchedLostItemId?: string;
  createdAt: string;
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationType =
  | 'lost_item_alert' // Alert to driver about new lost item
  | 'item_found' // Notification to user that item was found
  | 'item_not_found' // Notification to user that search completed
  | 'status_update' // General status update
  | 'match_found'; // Potential match between lost/found

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  swissPassId?: string;
  language: 'de' | 'fr' | 'it' | 'en';
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

// ============================================================================
// Form Types
// ============================================================================

export interface LostItemFormData {
  tripId: string;
  category: ItemCategory;
  description: string;
  color?: string;
  location: ItemLocation;
  locationDetail?: string;
  contactPhone?: string;
}

// ============================================================================
// WebSocket Event Types
// ============================================================================

export type WebSocketEvent =
  | { type: 'lost_item_created'; payload: LostItem }
  | {
      type: 'status_updated';
      payload: { itemId: string; status: LostItemStatus; message?: string };
    }
  | { type: 'item_found'; payload: { lostItemId: string; foundItemId: string } }
  | { type: 'driver_notification'; payload: { vehicleId: string; lostItem: LostItem } };

// ============================================================================
// Staff Types (Drivers, Conductors, Controllers, Cleaners, etc.)
// ============================================================================

export type StaffRole = 'driver' | 'conductor' | 'controller' | 'cleaner' | 'staff';

export interface StaffMember {
  id: string;
  name: string;
  employeeNumber: string;
  role: StaffRole;
  vehicleId?: string;
  isOnDuty: boolean;
}

/** @deprecated Use StaffMember instead */
export type Driver = StaffMember;

export type NotificationStatus = 'pending' | 'acknowledged' | 'found' | 'not_found';

export type NotificationPriority = 'normal' | 'urgent' | 'critical';

export interface StaffNotification {
  id: string;
  lostItemId: string;
  staffId: string;
  vehicleId: string;
  status: NotificationStatus;
  message: string;
  priority: NotificationPriority;
  location: string;
  category: ItemCategory;
  createdAt: string;
  acknowledgedAt?: string;
  respondedAt?: string;
  response?: {
    notes?: string;
    foundItem?: boolean;
    imageUrl?: string;
  };
  passengerInfo?: {
    tripRoute: string;
    tripTime: string;
    seatInfo?: string;
  };
}

/** @deprecated Use StaffNotification instead */
export type DriverNotification = StaffNotification;
