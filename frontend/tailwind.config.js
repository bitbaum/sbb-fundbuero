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
        // SBB typography scale
        'app-xs': ['12px', { lineHeight: '16px' }],
        'app-sm': ['14px', { lineHeight: '20px' }],
        'app-base': ['16px', { lineHeight: '24px' }],
        'app-lg': ['18px', { lineHeight: '28px' }],
        'app-xl': ['20px', { lineHeight: '28px' }],
        'app-2xl': ['24px', { lineHeight: '32px' }],
        'app-3xl': ['32px', { lineHeight: '40px' }],
      },
    },
  },
  plugins: [],
};
