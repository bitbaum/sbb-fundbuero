# SBB Fundbüro

@~/.claude/CLAUDE.md

---

## Project Overview

Real-time lost and found system for SBB (Swiss Federal Railways) that enables instant communication between passengers and train personnel.

**Problem Solved**: Traditional lost & found has 24-48h delay. This system enables reporting within minutes of loss, with real-time staff notification while items are still recoverable.

**Key Insight**: Time is critical - items reported within 30 minutes have >70% recovery rate vs <25% after 24 hours.

---

## Architecture

### Frontend (Primary Focus)
```
frontend/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Passenger app
│   ├── staff/page.tsx     # Staff notification interface (drivers, conductors, etc.)
│   └── demo/page.tsx      # Demo landing page
├── components/
│   ├── passenger/         # Passenger-specific components
│   ├── staff/             # Staff-specific components
│   └── ui/                # Shared UI components (SSOT)
│       ├── icons/         # All SVG icons
│       ├── LoadingSpinner.tsx
│       ├── Toast.tsx
│       └── ...
└── lib/
    ├── types.ts           # TypeScript types (SSOT)
    ├── config.ts          # Runtime configuration
    ├── labels.ts          # UI text labels (SSOT for i18n)
    ├── design-system.ts   # Design tokens reference
    └── mock-data.ts       # Demo data
```

### Backend (Services)
```
services/
├── reporting/             # Lost/found item API (Port 3001)
├── matching/              # AI-powered matching (Port 3002)
├── notification/          # Real-time notifications (Port 3003)
└── api-gateway/           # External API (Port 3000)
```

---

## Development Commands

### Quick Start (Recommended)
```bash
# Start all backend services
./scripts/dev.sh start

# In another terminal, start frontend
cd frontend && pnpm run dev
```

### Frontend Only (Demo Mode)
```bash
cd frontend
pnpm install          # Install dependencies
pnpm run dev          # Start dev server (localhost:3005)
pnpm run build        # Production build
pnpm run lint         # Lint code
```

### Full Stack with Docker
```bash
./scripts/dev.sh start     # Start backend services
./scripts/dev.sh frontend  # Start everything including frontend
./scripts/dev.sh stop      # Stop all services
./scripts/dev.sh health    # Check service health
./scripts/dev.sh logs      # View logs
```

### Service URLs
| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3005 | Next.js app (dev) |
| API Gateway | http://localhost:3000 | Proxy to all services |
| Reporting API | http://localhost:3001 | Lost items CRUD |
| Matching API | http://localhost:3002 | Item matching |
| Notification WS | ws://localhost:3003 | Real-time updates |
| API Docs | http://localhost:3001/docs | Swagger docs |

---

## Design System

**SSOT**: All design tokens are CSS custom properties in `frontend/app/globals.css`. `tailwind.config.js` references CSS vars (no literal values). `design-system.ts` mirrors select values for non-CSS runtime contexts only (canvas, Satori OG images).

### Token SSOT: `frontend/app/globals.css`

All tokens are CSS custom properties. `tailwind.config.js` maps Tailwind utilities → CSS vars (no literal values).

**WHITE-LABEL**: `:root` carries the neutral house brand (Nordbahn); each operator gets one `:root[data-tenant="…"]` override block. The active tenant is set on `<html data-tenant>` from `lib/tenant.ts` (env var `NEXT_PUBLIC_TENANT`).

**Brand tokens (tenant-driven) + neutral `app` palette:**
```css
--brand: #0b4f8f          /* neutral default; sbb tenant → #EB0000 */
--brand-hover / --brand-active / --brand-contrast
--font-brand: 'Inter'     /* sbb tenant → 'SBB Web' */
--app-white: #FFFFFF
--app-milk: #F6F6F6       /* page background */
--app-cloud: #E5E5E5      /* borders */
--app-silver: #DCDCDC
--app-aluminum: #D2D2D2
--app-platinum: #CDCDCD
--app-cement: #BDBDBD     /* active secondary bg */
--app-graphite: #B7B7B7
--app-storm: #A8A8A8
--app-smoke: #8D8D8D      /* fill-only (3.32:1) — never text */
--app-metal: #767676
--app-granite: #686868    /* secondary text */
--app-anthracite: #5A5A5A
--app-iron: #444444
--app-charcoal: #212121   /* primary text */
--app-midnight: #151515
--app-black: #000000
--app-blue: #2D327D       /* info state */
--app-success: #00973B
--app-warning: #FFAB00
--app-error: #EB0000
--app-info: #2D327D       /* = blue */
```

**Spacing, radius, shadows:**
```css
--app-space-xs/sm/md/lg/xl/2xl:  4/8/16/24/32/48px
--app-radius-sm/md/lg/xl:        4/8/16/24px
--app-shadow-card:   0 2px 8px rgba(0,0,0,0.08)
--app-shadow-modal:  0 4px 24px rgba(0,0,0,0.16)
--app-shadow-button: 0 2px 4px — brand-tinted, so a tenant token
```

**Typography** (literal values in tailwind.config.js — no CSS var approach for font-size arrays):
```
app-xs→12/16  app-sm→14/20  app-base→16/24  app-lg→18/28
app-xl→20/28  app-2xl→24/32  app-3xl→32/40
```

**Font:** `var(--font-brand), -apple-system, BlinkMacSystemFont, ...` (brand face from the tenant, then the system stack)

### TypeScript Mirror — `frontend/lib/design-system.ts`

Use ONLY in non-CSS runtime contexts (canvas drawing, Satori OG images, Recharts SVG attributes) where CSS vars are inaccessible. Do NOT use in React components — use Tailwind `brand` / `app-*` classes instead. Must stay in sync with `globals.css` manually.

### SSOT Rule

All design tokens live in `frontend/app/globals.css` only. `tailwind.config.js` references CSS vars. Components use `brand` / `app-*` Tailwind classes, never `bg-[#hex]` or inline styles.

**Audit:** `grep -r '\[#' frontend/` — every result is a violation.

---

## Key Files & SSOT Locations

| What | SSOT Location |
|------|---------------|
| TypeScript Types | `lib/types.ts` |
| Zod Schemas | `lib/schemas.ts` |
| Design Tokens | `app/globals.css` |
| UI Labels | `lib/labels.ts` |
| Config & Timing | `lib/config.ts` |
| API Client | `lib/api.ts` |
| React Hooks | `lib/hooks/` |
| Shared Icons | `components/ui/icons/` |
| Item Categories | `lib/types.ts` (ITEM_CATEGORY_CONFIG) |
| Error Boundary | `components/ui/ErrorBoundary.tsx` |
| App Providers | `components/providers/AppProvider.tsx` |

---

## Frontend-Backend Integration

### API Client (`lib/api.ts`)
Single client for all backend calls. Features:
- Automatic fallback to mock data when backend unavailable
- Typed responses
- WebSocket connection support

```typescript
import { api } from '@/lib/api';

// Make API call
const response = await api.reportLostItem(data);

// WebSocket connection
api.connectWebSocket(
  (event) => console.log('Message:', event),
  (error) => console.error('Error:', error)
);
```

### React Hooks (`lib/hooks/`)
| Hook | Purpose |
|------|---------|
| `useTrips()` | Fetch user's trips with fallback |
| `useStaffNotificationsApi()` | Staff notifications with local updates |
| `useReportLostItem()` | Submit lost item report |
| `useWebSocket()` | Real-time connection management |
| `useApiHealth()` | Check backend availability |

### Demo Mode
When backend is unavailable, frontend automatically uses mock data from `lib/mock-data.ts`. No code changes needed - the hooks handle fallback gracefully.

---

## Adding New Features

### Adding a new item category
1. Add to `ITEM_CATEGORIES` in `lib/types.ts`
2. Add config to `ITEM_CATEGORY_CONFIG` (same file)
3. Done - forms and UI auto-generate from config

### Adding a new notification status
1. Add to `NotificationStatus` type in `lib/types.ts`
2. Add config to `NOTIFICATION_STATUS_CONFIG` in `lib/labels.ts`
3. Done

### Adding a new icon
1. Add to `components/ui/icons/index.tsx`
2. Export from that file
3. Import where needed

**Target**: 1-2 files for any new field/feature

---

## Quality Checklist

Before committing:
- [ ] No hardcoded colors (use Tailwind brand / app-* classes)
- [ ] No duplicate components (check ui/ first)
- [ ] Labels in lib/labels.ts (not in components)
- [ ] Types in lib/types.ts
- [ ] Magic numbers in lib/config.ts (timing, validation limits)
- [ ] Touch targets minimum 44x44px (w-11 h-11)
- [ ] Input fields have maxLength from config.validation
- [ ] ARIA roles on interactive elements (tabs, dialogs)
- [ ] Build passes: `pnpm run build`

---

## Production Readiness

### Input Validation
- All text inputs have `maxLength` from `config.validation`
- Description: 3-500 chars, Notes: max 1000 chars
- Add new limits to `lib/config.ts` validation section

### Accessibility (a11y)
- Touch targets: minimum 44x44px (w-11 h-11 in Tailwind)
- Tab lists: `role="tablist"`, `role="tab"`, `aria-selected`
- Dialogs: `role="dialog"`, `aria-modal`, `aria-labelledby`
- Labels centralized in `lib/labels.ts` (UI_LABELS.a11y)

### Timing Constants
All timing values in `lib/config.ts`:
- `config.timing.toastDuration` (4000ms)
- `config.timing.successMessageDelay` (2000ms)
- `config.timing.demoNotificationDelay` (5000ms)

### Zod Schema Validation
Runtime validation for API responses in `lib/schemas.ts`:

```typescript
import { lostItemSchema, validateApiResponse } from '@/lib/schemas';

// Validate API response
const validatedData = validateApiResponse(lostItemSchema, apiResponse);

// Form validation with error messages
const result = validateForm(lostItemFormSchema, formData);
if (!result.success) {
  // result.errors contains field-level error messages
}
```

### Error Boundary
App wrapped with ErrorBoundary in `AppProvider`:
- Catches rendering errors
- Shows user-friendly German error message
- Provides retry button

---

## Demo Flow

1. **Passenger reports loss** (`/`) → Selects trip → Chooses category → Describes item
2. **Staff receives notification** (`/staff`) → Real-time alert with location
3. **Staff responds** → Found / Not found
4. **Passenger gets update** → Status change notification

Demo landing page at `/demo` explains the concept.

---

**Last Updated**: 2026-09-04
