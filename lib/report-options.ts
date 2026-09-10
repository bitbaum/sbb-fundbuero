/**
 * The closed sets a report chooses from.
 *
 * ONE definition, imported by both the client (to render the buttons) and
 * `lib/server/validation.ts` (to reject anything else). Two lists would drift,
 * and the drift would look like a passenger sending an invalid category rather
 * than like the bug it is.
 *
 * Every value here needs a `category.<value>` / `area.<value>` message key in
 * all four catalogues. `lib/i18n/__tests__` fails the build if one is missing.
 */

export const CATEGORIES = [
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

export type Category = (typeof CATEGORIES)[number];

/**
 * Where in the vehicle. Not free text: these are the places things are
 * actually left, and a closed set is something the matcher can compare while
 * a sentence is not.
 */
export const AREAS = ['seat', 'table', 'overhead', 'floor', 'wc', 'entrance', 'unknown'] as const;

export type Area = (typeof AREAS)[number];
