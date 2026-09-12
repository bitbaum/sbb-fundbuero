import type { MetadataRoute } from 'next';
import { tenant } from '@/lib/tenant';

/**
 * PWA manifest, generated per tenant. Previously a static public/manifest.json
 * hardcoded one operator's name and theme colour — the one branding surface
 * the tenant SSOT (lib/tenant.ts) didn't reach, so even the neutral default
 * build shipped another operator's trademark to any home screen it was
 * installed to.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: tenant.productName,
    short_name: tenant.wordmark,
    description: tenant.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: tenant.themeColor,
    // Without this an install to a home screen gets a blank square. It points
    // at the same generated route as the tab icon (app/icon.tsx), so there is
    // one icon, tenant-coloured, and no committed image file sitting outside
    // the tenant SSOT.
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
  };
}
