/**
 * Every coloured badge in the app, as a token PAIR.
 *
 * One definition, for two readers: the components that render them, and
 * `lib/__tests__/contrast.test.ts`, which checks each pair against WCAG AA for
 * every tenant. A badge built inline in a component is a badge nothing checks
 * — and the last time that happened it shipped white-on-amber at 2.15:1, on
 * the one badge a passenger sees while still hoping.
 *
 * Both halves must be design tokens. A raw Tailwind colour (`bg-amber-500`)
 * resolves to nothing in the token SSOT and the test rejects it before
 * contrast is even considered.
 *
 * Adding a badge means adding it here. That is the point.
 */

export interface BadgeTokens {
  /** Tailwind class backed by a `--app-*` or `--brand` custom property. */
  color: string;
  textColor: string;
}

/**
 * The crew connection indicator.
 *
 * Text as well as colour — colour alone is not a signal (WCAG 1.4.1), and this
 * is the one indicator crew must be able to trust at a glance while walking.
 */
export const CONNECTION_BADGE_TOKENS: Record<'live' | 'connecting' | 'down', BadgeTokens> = {
  live: { color: 'bg-app-success', textColor: 'text-white' },
  // Charcoal on amber, not white: amber is too light to carry white text at
  // any usable saturation.
  connecting: { color: 'bg-app-warning', textColor: 'text-app-charcoal' },
  down: { color: 'bg-app-error', textColor: 'text-white' },
};

export const ALL_BADGE_TOKENS: Record<string, BadgeTokens> = {
  ...Object.fromEntries(
    Object.entries(CONNECTION_BADGE_TOKENS).map(([k, v]) => [`connection.${k}`, v]),
  ),
};
