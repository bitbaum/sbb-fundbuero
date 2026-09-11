/** @type {import('tailwindcss').Config} */
module.exports = {
  // lib/ is NOT optional here. This codebase deliberately keeps UI class names
  // in config (lib/labels.ts owns NOTIFICATION_STATUS_CONFIG), and Tailwind
  // only emits a class it can SEE in the content globs. While lib/ was missing,
  // `bg-app-granite` and `bg-amber-500` were never generated, so the
  // "Nicht gefunden" and "In Bearbeitung" badges shipped as white text on no
  // background — invisible — while the source looked perfectly correct.
  // Enforced by lib/__tests__/contrast.test.ts.
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Values are CSS vars defined in app/globals.css — never literals here.
      // `brand` is semantic (it is whatever the active tenant's colour is);
      // `app` is the shared neutral/functional palette.
      colors: {
        brand: {
          DEFAULT: 'var(--brand)',
          hover: 'var(--brand-hover)',
          active: 'var(--brand-active)',
          contrast: 'var(--brand-contrast)',
          // Tint surfaces. Use these instead of `bg-brand/10`-style opacity
          // modifiers, which this config cannot support — see globals.css.
          surface: 'var(--brand-surface)',
          'surface-hover': 'var(--brand-surface-hover)',
          edge: 'var(--brand-edge)',
        },
        app: {
          white: 'var(--app-white)',
          milk: 'var(--app-milk)',
          cloud: 'var(--app-cloud)',
          silver: 'var(--app-silver)',
          aluminum: 'var(--app-aluminum)',
          platinum: 'var(--app-platinum)',
          cement: 'var(--app-cement)',
          graphite: 'var(--app-graphite)',
          storm: 'var(--app-storm)',
          smoke: 'var(--app-smoke)',
          metal: 'var(--app-metal)',
          granite: 'var(--app-granite)',
          anthracite: 'var(--app-anthracite)',
          iron: 'var(--app-iron)',
          charcoal: 'var(--app-charcoal)',
          midnight: 'var(--app-midnight)',
          black: 'var(--app-black)',
          blue: 'var(--app-blue)',
          success: 'var(--app-success)',
          'success-surface': 'var(--app-success-surface)',
          warning: 'var(--app-warning)',
          error: 'var(--app-error)',
          'error-text': 'var(--app-error-text)',
          info: 'var(--app-info)',
        },
      },
      fontFamily: {
        // Brand face comes from the tenant (--font-brand); the rest is the
        // shared system stack.
        sans: [
          'var(--font-brand)',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      // Spacing, radius, shadows — values defined as CSS vars in app/globals.css
      spacing: {
        'app-xs': 'var(--app-space-xs)',
        'app-sm': 'var(--app-space-sm)',
        'app-md': 'var(--app-space-md)',
        'app-lg': 'var(--app-space-lg)',
        'app-xl': 'var(--app-space-xl)',
        'app-2xl': 'var(--app-space-2xl)',
      },
      borderRadius: {
        'app-sm': 'var(--app-radius-sm)',
        'app-md': 'var(--app-radius-md)',
        'app-lg': 'var(--app-radius-lg)',
        'app-xl': 'var(--app-radius-xl)',
      },
      boxShadow: {
        'app-card': 'var(--app-shadow-card)',
        'app-modal': 'var(--app-shadow-modal)',
        'app-button': 'var(--app-shadow-button)',
      },
      fontSize: {
        // SBB's scale (Lyne `sbb-typo-scale-*`), with SBB's two line-height /
        // letter-spacing pairs baked in rather than left to the cascade — a
        // Tailwind fontSize utility emits its own line-height and would
        // otherwise silently override the body metrics.
        //
        // The split at 20px is ours, not SBB's: Lyne publishes the two pairs
        // but not which sizes take which. Everything that is body copy in this
        // app is 18px or smaller, and everything larger is a heading.
        'app-xs': ['12px', { lineHeight: '1.75', letterSpacing: '0.03em' }],
        'app-2xs': ['13px', { lineHeight: '1.75', letterSpacing: '0.03em' }],
        'app-sm': ['14px', { lineHeight: '1.75', letterSpacing: '0.03em' }],
        'app-base': ['16px', { lineHeight: '1.75', letterSpacing: '0.03em' }],
        'app-lg': ['18px', { lineHeight: '1.75', letterSpacing: '0.03em' }],
        'app-xl': ['20px', { lineHeight: '1.4', letterSpacing: '0em' }],
        'app-2xl': ['24px', { lineHeight: '1.4', letterSpacing: '0em' }],
        'app-3xl': ['32px', { lineHeight: '1.4', letterSpacing: '0em' }],
        'app-4xl': ['40px', { lineHeight: '1.4', letterSpacing: '0em' }],
        'app-5xl': ['48px', { lineHeight: '1.4', letterSpacing: '0em' }],
        'app-6xl': ['56px', { lineHeight: '1.4', letterSpacing: '0em' }],
        'app-7xl': ['64px', { lineHeight: '1.4', letterSpacing: '0em' }],
      },
    },
  },
  plugins: [],
};
