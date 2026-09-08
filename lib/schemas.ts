/**
 * Zod Schemas - Runtime Validation
 *
 * This file contains Zod schemas for runtime validation of API responses
 * and form data. Types are defined separately in lib/types.ts (SSOT for types).
 *
 * Usage:
 * import { lostItemSchema, validateApiResponse } from '@/lib/schemas';
 * import type { LostItem } from '@/lib/types';
 *
 * const validatedData = validateApiResponse(lostItemSchema, apiResponse);
 */

import { z } from 'zod';
import { config } from './config';

// ============================================================================
// Base Schemas
// ============================================================================

export const vehicleTypeSchema = z.enum(['train', 'tram', 'bus']);
// Free string, not an enum — operators are deployment data in a white-label
// app. See lib/tenant.ts.
export const operatorSchema = z.string().min(1);
export const tripStatusSchema = z.enum(['upcoming', 'active', 'completed', 'cancelled']);

export const vehicleSchema = z.object({
  id: z.string(),
  type: vehicleTypeSchema,
  line: z.string(),
  number: z.string(),
  operator: operatorSchema,
});

export const stationSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().optional(),
});

export const tripSchema = z.object({
  id: z.string(),
  vehicle: vehicleSchema,
  origin: stationSchema,
  destination: stationSchema,
  departureTime: z.string().datetime(),
  arrivalTime: z.string().datetime(),
  car: z.string().optional(),
  seat: z.string().optional(),
  platform: z.string().optional(),
  status: tripStatusSchema,
});

// ============================================================================
// Lost Item Schemas
// ============================================================================

export const itemCategorySchema = z.enum([
  'electronics',
  'bags',
  'clothing',
  'documents',
  'keys',
  'wallet',
  'glasses',
  'umbrella',
  'other',
]);

export const itemLocationSchema = z.enum([
  'seat',
  'table',
  'overhead',
  'floor',
  'bathroom',
  'entrance',
  'unknown',
]);

export const lostItemStatusSchema = z.enum([
  'reported',
  'searching',
  'found',
  'not_found',
  'returned',
  'in_depot',
  'closed',
]);

export const statusUpdateSchema = z.object({
  id: z.string(),
  lostItemId: z.string(),
  status: lostItemStatusSchema,
  message: z.string().optional(),
  updatedBy: z.enum(['system', 'driver', 'staff', 'user']),
  createdAt: z.string().datetime(),
});

export const lostItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tripId: z.string(),
  category: itemCategorySchema,
  description: z
    .string()
    .min(config.validation.description.minLength)
    .max(config.validation.description.maxLength),
  color: z.string().optional(),
  location: itemLocationSchema,
  locationDetail: z.string().optional(),
  imageUrl: z.string().url().optional(),
  status: lostItemStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  trip: tripSchema.optional(),
  statusHistory: z.array(statusUpdateSchema).optional(),
});

// ============================================================================
// Form Schemas (for client-side validation)
// ============================================================================

export const lostItemFormSchema = z.object({
  tripId: z.string().min(1, 'Reise muss ausgewählt werden'),
  category: itemCategorySchema,
  description: z
    .string()
    .min(
      config.validation.description.minLength,
      `Mindestens ${config.validation.description.minLength} Zeichen`,
    )
    .max(
      config.validation.description.maxLength,
      `Maximal ${config.validation.description.maxLength} Zeichen`,
    ),
  color: z.string().optional(),
  location: itemLocationSchema,
  locationDetail: z.string().optional(),
  contactPhone: z.string().optional(),
});

export const driverResponseSchema = z.object({
  notificationId: z.string(),
  status: z.enum(['found', 'not_found']),
  notes: z.string().max(config.validation.notes.maxLength).optional(),
});

// ============================================================================
// API Response Schemas
// ============================================================================

export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    meta: z
      .object({
        total: z.number().optional(),
        page: z.number().optional(),
        pageSize: z.number().optional(),
      })
      .optional(),
  });

export const lostItemResponseSchema = apiResponseSchema(lostItemSchema);
export const lostItemsListResponseSchema = apiResponseSchema(z.array(lostItemSchema));
export const tripResponseSchema = apiResponseSchema(tripSchema);
export const tripsListResponseSchema = apiResponseSchema(z.array(tripSchema));

// ============================================================================
// Driver Notification Schemas
// ============================================================================

export const notificationStatusSchema = z.enum(['pending', 'acknowledged', 'found', 'not_found']);
export const notificationPrioritySchema = z.enum(['normal', 'urgent', 'critical']);

export const driverNotificationSchema = z.object({
  id: z.string(),
  lostItemId: z.string(),
  driverId: z.string(),
  vehicleId: z.string(),
  status: notificationStatusSchema,
  message: z.string(),
  priority: notificationPrioritySchema,
  location: z.string(),
  category: itemCategorySchema,
  createdAt: z.string().datetime(),
  acknowledgedAt: z.string().datetime().optional(),
  respondedAt: z.string().datetime().optional(),
  response: z
    .object({
      notes: z.string().optional(),
      foundItem: z.boolean().optional(),
      imageUrl: z.string().url().optional(),
    })
    .optional(),
  passengerInfo: z
    .object({
      tripRoute: z.string(),
      tripTime: z.string(),
      seatInfo: z.string().optional(),
    })
    .optional(),
});

// ============================================================================
// Type Exports
// ============================================================================
// NOTE: Types are defined in lib/types.ts (SSOT for types).
// Import types from there. This file only exports schemas and validation helpers.

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates API response and returns typed data or throws error
 */
export function validateApiResponse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error('API validation failed:', result.error.flatten());
    throw new Error('Invalid API response format');
  }
  return result.data;
}

/**
 * Validates form data and returns errors object for UI display
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: Record<string, string[]> } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  return { success: true, data: result.data };
}
