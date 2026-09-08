/**
 * Design system — JS constants for non-CSS contexts only.
 *
 * SSOT is app/globals.css (CSS custom properties).
 * Use this file ONLY where CSS vars are inaccessible at runtime:
 * canvas drawing, Satori OG images, charting libraries (Recharts SVG attrs).
 * Do NOT use in React components — use Tailwind app-* classes instead.
 *
 * Values must stay in sync with globals.css manually.
 * Values mirror the CSS custom properties in app/globals.css.
 */

// ============================================================================
// Colour palette (mirrors globals.css)
// Source: https://digital.sbb.ch/en/foundation/colors/base-colors/
// ============================================================================

export const APP_COLORS = {
  // Primary
  red: '#EB0000',
  'red-125': '#C60018',
  'red-150': '#A20013',

  // Neutrals
  white: '#FFFFFF',
  milk: '#F6F6F6',
  cloud: '#E5E5E5',
  silver: '#DCDCDC',
  cement: '#BDBDBD',
  smoke: '#8D8D8D',
  granite: '#686868',
  iron: '#444444',
  charcoal: '#212121',

  // Functional
  blue: '#2D327D',
  success: '#00973B',
  warning: '#FFAB00',

  // Extended palette for gradients (use sparingly)
  gradients: {
    urgentStart: '#FF5722',
    urgentEnd: '#FF8A65',
    activeStart: '#1976D2',
    activeEnd: '#42A5F5',
  },
} as const;

// ============================================================================
// Spacing (4px base grid)
// ============================================================================

export const APP_SPACING = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
} as const;

// ============================================================================
// Border Radius
// ============================================================================

export const APP_RADIUS = {
  sm: '4px',
  md: '8px',
  lg: '16px',
  xl: '24px',
} as const;

// ============================================================================
// Typography Scale
// ============================================================================

export const APP_TYPOGRAPHY = {
  xs: ['12px', { lineHeight: '16px' }],
  sm: ['14px', { lineHeight: '20px' }],
  base: ['16px', { lineHeight: '24px' }],
  lg: ['18px', { lineHeight: '28px' }],
  xl: ['20px', { lineHeight: '28px' }],
  '2xl': ['24px', { lineHeight: '32px' }],
  '3xl': ['32px', { lineHeight: '40px' }],
} as const;

// ============================================================================
// Shadows
// ============================================================================

export const APP_SHADOWS = {
  card: '0 2px 8px rgba(0, 0, 0, 0.08)',
  modal: '0 4px 24px rgba(0, 0, 0, 0.16)',
  button: '0 2px 4px rgba(235, 0, 0, 0.24)',
} as const;

// ============================================================================
// Timing Windows (domain-specific)
// ============================================================================

export const REPORTING_WINDOWS = {
  instantAlertMinutes: 30, // Driver gets instant notification
  priorityHours: 2, // Priority handling
  standardHours: 24, // Standard queue
} as const;

// ============================================================================
// Type exports for TypeScript
// ============================================================================

export type AppColor = keyof typeof APP_COLORS;
export type AppSpacing = keyof typeof APP_SPACING;
