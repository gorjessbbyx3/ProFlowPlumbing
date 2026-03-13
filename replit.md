# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + TailwindCSS v4 + Wouter (routing)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Application: 808 All Purpose Cleaners

Business management app for a cleaning company in South Oahu, HI (cars, boats, condos).

- **Company**: 808 All Purpose Cleaners
- **Phone**: 808-723-1011
- **Email**: Lainecaldera@aol.com
- **Brand color**: Deep navy blue #003087

### Modules (13 total)

1. **Dashboard** — Stats overview, recent bookings, New Business Checklist (62 items, 9 categories)
2. **Employees** — CRUD for staff members
3. **Scheduling** — Shift management with calendar view
4. **Bookings** — Job booking management
5. **Clients** — Customer database
6. **Invoices** — Invoice generation and tracking
7. **Receipts** — Payment receipt tracking
8. **Expenses** — Expense tracking with categories and date filters
9. **Labor & Payroll** — Hours logging, pay calculation
10. **To-Do List** — Task management with priorities
11. **Follow-Ups** — Lead/client follow-up tracking
12. **Campaign Manager** — Marketing campaign planning
13. **Tax Reports** — Revenue, expense, and profit reporting

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (port 8080)
│   └── cleaners-app/       # React + Vite frontend (dynamic port via PORT env)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── attached_assets/        # Logo and other assets
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers for all 13 modules
- Route files: employees, shifts, clients, bookings, invoices, receipts, expenses, laborEntries, todos, followups, campaigns, checklist, reports
- Checklist auto-seeds 62 items across 9 categories on first startup
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)

### `artifacts/cleaners-app` (`@workspace/cleaners-app`)

React + Vite frontend with TailwindCSS v4 and Wouter routing.

- Entry: `src/App.tsx` — QueryClient, Router setup
- Pages: `src/pages/` — 13 page components (Dashboard, Employees, Scheduling, Bookings, Clients, Invoices, Receipts, Expenses, Labor, Todos, Followups, Campaigns, Reports)
- Layout: `src/components/Layout.tsx` — Sidebar navigation with all 13 modules
- UI Components: `src/components/ui/` — Card, Badge, Toaster, Tooltip
- Utilities: `src/lib/utils.ts` — cn, formatCurrency, formatDate, getStatusColor
- Logo: imported from `@assets/` alias → `attached_assets/`
- Depends on: `@workspace/api-client-react`

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- Schema tables: employees, shifts, clients, bookings, invoices, receipts, expenses, laborEntries, todos, followups, campaigns, checklistItems
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec. Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec.

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`.

## Development Notes

- Express 5 async handlers use `Promise<void>` return types
- Response pattern: `res.status(200).json(data); return;` (not `return res.json()`)
- API routes are all prefixed under `/api`
- Frontend uses `import.meta.env.BASE_URL` for asset paths
- Vite aliases: `@` → `src/`, `@assets` → `attached_assets/`
