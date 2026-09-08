# AGENTS.md (Multi-Model Development)

Operational guide for working on this monorepo with multiple AI coding agents including Cursor IDE models.

## Coordination
- Shared activity log: `AGENTS_SYNC.md` (append-only; actions, commands, results).
- Task list: `TASK_QUEUE.md` (prioritized; update owner/status inline).
- Claims/locks: use `scripts/claim.sh <area> "summary"` to avoid collisions.
- Smoke checks: run `scripts/smoke.sh [base_url]` and include output in log entries.
- Keep entries concise and timestamped; do not rewrite history.

## 🤖 Available AI Agents

This project leverages multiple AI coding models through Cursor IDE for different specialized tasks:

### **Cursor Models Available**
- **Code-Supernova-1-Million** - Advanced reasoning, massive context window, next-gen Claude capabilities
- **Grok Code** - Fast, practical coding with real-time web access and current knowledge
- **Claude Code** - Balanced coding assistant with strong TypeScript/Node.js expertise
- **Other Models** - Cursor continuously updates with latest models (GPT-4, etc.)

### **Agent Selection Guide**
- **Complex Architecture & System Design** → Code-Supernova-1-Million (massive context)
- **API Integration & Database Work** → Claude Code (TypeScript expertise)
- **Quick Fixes & Current Tech Updates** → Grok Code (real-time knowledge)
- **Frontend & UI Development** → Choose model with strong web dev capabilities
- **DevOps & Infrastructure** → Model with strong shell/systems knowledge

### **Handoff Protocol**
- Use `make handoff AGENT=<model> NEXT="<description>" BASE_URL=<url>`
- Include current context, recent changes, and next steps in handoff
- Update TASK_QUEUE.md with new owner and ETA
- Test handoffs work smoothly between agents

## Overview
- Microservices monorepo (Node.js/TypeScript) with a pnpm workspace.
- Event‑driven via Redis pub/sub; PostgreSQL as primary DB.
- Real‑time updates with Socket.IO; OpenAPI docs via Swagger UI.

Structure
- `services/`
  - `api-gateway/` (port 3000)
  - `reporting/` (port 3001)
  - `matching/` (port 3002)
  - `notification/` (port 3003)
- `shared/`
  - `types/` (TypeScript types)
  - `utils/` (shared utilities, if present)
- `database/` init assets for local Postgres
- `k8s/` manifests

## Prerequisites
- Node >= 20, pnpm 11
- Docker + Docker Compose (for full stack)
- Local Postgres and Redis OR use Compose services

## Core Commands (run in repo root)
- `pnpm install`: Install all workspace deps
- `pnpm run build`: Build all workspaces
- `pnpm run dev`: `docker-compose up -d` then start all workspaces in dev
- `pnpm test`: Run tests (reporting service + frontend)
- `pnpm run lint`: Lint across workspaces (where configured)
- `pnpm run typecheck`: TypeScript `--noEmit` across workspaces
- `pnpm run clean`: Remove build artifacts per workspace

Workspace‑scoped (examples)
- `pnpm --filter @sbb-fundbuero/types run build`
- `pnpm --filter @sbb-fundbuero/reporting-service run build`

Docker/K8s
- `pnpm run docker:build` | `pnpm run docker:up` | `pnpm run docker:down`
- `pnpm run k8s:deploy` (expects kubectl context configured)

Agent Tools
- `make agent-log SUMMARY="..." CHANGES="..." COMMANDS="..." NOTES="..." AGENT=<model-name>`
- `scripts/claim.sh <area> "Short intent summary"` (AGENT_NAME/ETA env vars)
- `scripts/smoke.sh [base_url]` (defaults to `http://localhost:3001`)
- `make jwt JWT_SECRET=... PAYLOAD='{"id":"u1","email":"u1@example.com"}' EXPIRES=3600`
- `make handoff AGENT=<model> NEXT="short next steps" BASE_URL=http://localhost:3001`
- `make refresh-claim AGENT=<model> AREA="services/reporting" ETA=45m`

**Cursor Integration:**
- Launch Cursor on this workspace and select desired model from the available options
- Models auto-detect project structure and can seamlessly take over tasks
- Use "Apply" feature to implement changes suggested by any model
- Models have access to full workspace context and can run terminal commands

JWT Testing
- Generate a token with the same `JWT_SECRET` used by the service.
- Example usage:
  - `JWT_SECRET=your-secret ./scripts/generate-jwt.js`
  - `make jwt JWT_SECRET=your-secret`

## Environment
Common vars
- `PORT`: Service port
- `CORS_ORIGIN`: Allowed origin(s), default `*`
- `JWT_SECRET`: For auth middleware (dev default present)
- Postgres (Reporting service expects discrete vars)
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Redis
  - `REDIS_URL` (e.g., `redis://localhost:6379`)

Notes
- `docker-compose.yml` sets a `DATABASE_URL` for containers, but the reporting service code uses discrete `DB_*` vars. For local runs outside Compose, export `DB_*` vars.
- Logging writes to `logs/` in some services. Ensure the folder exists or prefer Console transport in dev.

## Local Development Flows
Option A: Full stack via Compose
- `pnpm run docker:up`
- Access: API Gateway `http://localhost:3000`, Reporting `http://localhost:3001` (docs at `/docs`)

Option B: Run reporting service only
- Start Postgres + Redis locally (or via Compose) 
- Export env: `DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, REDIS_URL, PORT`
- Build deps: `pnpm --filter @sbb-fundbuero/types run build`
- Build service: `pnpm --filter @sbb-fundbuero/reporting-service run build`
- Dev: `pnpm --filter @sbb-fundbuero/reporting-service run dev`
- Health: `GET /health`, Docs: `GET /docs`

## Design System

**SSOT situation**: Token values live in `frontend/app/globals.css` as CSS custom properties (white-label: `:root` is the neutral house brand, each operator gets a `:root[data-tenant="…"]` override block). `frontend/tailwind.config.js` references those vars — no literal hex. A TypeScript mirror exists at `frontend/lib/design-system.ts` (`APP_*` constants) for non-CSS contexts only; it must stay in sync with `globals.css` manually.

### Color Tokens (use `brand` / `app-*` Tailwind classes in components)

```
brand / brand-hover / brand-active     — tenant brand colour (sbb tenant → SBB red)
app-charcoal                           — primary text (#212121)
app-granite                            — secondary text (#686868)
app-smoke                              — fill-only (#8D8D8D — never text)
app-cloud                              — borders (#E5E5E5)
app-milk                               — page background (#F6F6F6)
app-white                              — card/surface background (#FFFFFF)
app-success / app-warning / app-error  — functional states
app-blue / app-info                    — info state (#2D327D)
```

### Spacing / Radius / Shadow classes

```
Spacing:       p-app-xs (4px) / p-app-sm (8px) / p-app-md (16px) / p-app-lg (24px) / p-app-xl (32px) / p-app-2xl (48px)
Border radius: rounded-app-sm (4px) / rounded-app-md (8px) / rounded-app-lg (16px) / rounded-app-xl (24px)
Shadows:       shadow-app-card / shadow-app-modal / shadow-app-button
```

### Utility classes defined in `frontend/app/globals.css`

Pre-built component classes (use these, do not rebuild inline):
- `.btn-app-primary` / `.btn-app-secondary` / `.btn-app-ghost`
- `.card-app` / `.input-app` / `.header-app`
- `.mobile-container` / `.safe-top` / `.safe-bottom` / `.bottom-nav`
- `.modal-overlay` / `.modal-content` / `.toast`
- `.touch-feedback` / `.hide-scrollbar`
- `.animate-slide-up` / `.animate-slide-down` / `.animate-fade-in` / `.animate-pulse-ring` / `.animate-pulse-subtle`

### SSOT Rule

All design tokens live in `app/globals.css` only. Tailwind config MUST reference CSS vars (`'var(--name)'`), never literal values. Components MUST use semantic Tailwind classes, never arbitrary values like `bg-[#hex]`.

**Violations to fix when touching UI:**
- `bg-[#hex]` / `text-[#hex]` in className → CSS var + semantic class
- `style={{ color: '#hex' }}` → CSS var + className
- Literal hex in tailwind.config → `'var(--color-name)'`
- Same token defined in 2+ files → consolidate to globals.css

**Audit:** `grep -r '\[#' frontend/` — every result is a violation.

## Coding Standards
- TypeScript strict; Node ESM/CJS as per tsconfig per service
- Linting with ESLint where configured; formatting via Prettier if present
- Prefer small, focused changes; update docs and types in `shared/` when APIs evolve
- Keep services isolated; shared contracts belong in `shared/types`

## Testing
- Framework: Jest for services (where configured)
- Conventions
  - Unit tests near source or in `__tests__` (service preference)
  - Name: `*.test.ts` or `*.spec.ts`
- Commands
  - `pnpm --filter @sbb-fundbuero/reporting-service run test`
- Add regression tests for fixed bugs; keep tests fast and isolated

## Database
- Local dev DB initialized by Compose via `database/init`
- Reporting service scripts
  - `pnpm --filter @sbb-fundbuero/reporting-service run db:migrate`
  - `pnpm --filter @sbb-fundbuero/reporting-service run db:seed`
- Use proper indexing for new queries (follow existing schema patterns)

## Common Tasks
- Add route (Reporting)
  - Define validation in `src/middleware/validation.ts`
  - Implement controller in `src/controllers`
  - Wire route in `src/routes`
  - Update OpenAPI annotations and verify `/docs`
- Add event
  - Publish via `redisPublisher.publish(channel, payload)`
  - Subscribe in service startup and broadcast via Socket.IO as needed
- Extend data contracts
  - Update `shared/types/src/index.ts`
  - Rebuild `@sbb-fundbuero/types`, then services

## Troubleshooting
- TypeScript build breaks in reporting
  - Ensure `@sbb-fundbuero/types` is built first
  - Redis subscribe signature: use array of channels and typed callback
- DB/Redis connection issues
  - Verify `DB_*` and `REDIS_URL`; check Compose health
- Logs directory
  - Create `logs/` or set `NODE_ENV!=production` to prefer Console transport
- Port conflicts
  - Adjust `PORT` per service or stop conflicting processes

## Security & Ops
- JWT required on protected endpoints; rotate secrets for non‑dev
- Rate limiting via Redis middleware per route
- Follow OWASP/ASVS for changes; avoid logging PII

## Contributing With AI Agents
- Prefer targeted builds (`--workspace`) and minimal diffs
- Use "Apply" feature in Cursor to implement changes suggested by any model
- Run typecheck and (where configured) lint before finishing
- Update this file when behavior or commands change
- Leverage each model's strengths:
  - **Code-Supernova-1-Million**: Complex multi-step tasks, architecture decisions
  - **Grok Code**: Quick implementations, current best practices, real-time updates
  - **Claude Code**: TypeScript expertise, clean code patterns, documentation
