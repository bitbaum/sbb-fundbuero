import { ImageResponse } from 'next/og';

import { tenant } from '@/lib/tenant';

/**
 * The browser-tab icon, generated per tenant.
 *
 * The app shipped none at all, so every tab showed the browser's blank-page
 * glyph and `/favicon.ico` 404'd on every page load — which is both a visible
 * blemish on a site meant to be shared and a line of noise in every console
 * anyone opens while looking at it.
 *
 * Generated rather than committed as a file, for the same reason
 * `opengraph-image.tsx` and `manifest.ts` are: an icon checked into `public/`
 * is a fourth place an operator's identity lives, invisible to the tenant SSOT
 * and to `pnpm run check:tenant`. Swapping `NEXT_PUBLIC_TENANT` has to change
 * the icon too, or a re-branded build wears the previous operator's colour in
 * the one place a person looks to find the tab again.
 *
 * Satori cannot read CSS custom properties, so the colour comes from the
 * tenant's `themeColor` — the field that exists precisely for surfaces
 * rendered before any CSS does.
 *
 * The mark is the first letter of the wordmark, reversed out of the brand
 * colour. Not the real logo: that is a registered trademark, and a pitch
 * artefact reproducing it as a favicon is the impersonation this repository
 * takes care to avoid. A single letter in the right colour is recognisable at
 * 32px without pretending to be the operator's mark.
 */
export const contentType = 'image/png';

/**
 * Three sizes from one drawing: 32 for the tab, 192 and 512 for an install.
 * The manifest used to name only the 32px one, which is below what Android
 * accepts for an install, so the browser never offered to install the app.
 * Served at /icon/32, /icon/192 and /icon/512.
 */
const SIZES = [32, 192, 512] as const;

export function generateImageMetadata() {
  return SIZES.map((edge) => ({
    id: String(edge),
    size: { width: edge, height: edge },
    contentType,
  }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const edge = Number(await id);
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: tenant.themeColor,
        color: '#FFFFFF',
        fontSize: Math.round(edge * 0.69),
        fontWeight: 700,
        fontFamily: 'sans-serif',
        // A tab favicon is masked to a rounded square by most browsers
        // anyway; rounding it here keeps the corners from being clipped
        // into hard right angles against a dark tab strip.
        borderRadius: Math.round(edge * 0.1875),
      }}
    >
      {tenant.wordmark.slice(0, 1)}
    </div>,
    { width: edge, height: edge },
  );
}
