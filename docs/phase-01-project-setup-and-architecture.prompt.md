---
mode: agent
description: Phase 1 — Project Setup & Architecture for Inventory Shipping App
---

# Phase 1: Project Setup & Architecture

## Context

You are building a production-grade **Pharmacy Inventory and Shipping** web application. The system serves two roles:

- **Branch Pharmacy** — manages local inventory, creates customer orders, submits refill requests, receives inbound shipments.
- **Distribution Center (Warehouse)** — monitors branch health, creates dispatches from refill requests, tracks network-wide movement.

The stack is **React (frontend) + Node.js (backend)**, deployed to the cloud as separate services.

## Goal

Scaffold the full project as a **pnpm monorepo** with the following workspace packages:

```
/
├── apps/
│   ├── web/          # React + Vite + TypeScript frontend
│   └── api/          # Node.js + Express + TypeScript backend
├── packages/
│   └── shared/       # Shared TypeScript types and constants
├── pnpm-workspace.yaml
├── package.json      # Root workspace package
└── turbo.json        # Turborepo pipeline config
```

## Requirements

### Tooling & Standards

- **Package manager**: pnpm (workspaces)
- **Build orchestration**: Turborepo
- **Language**: TypeScript (strict mode) across all packages
- **Linting**: ESLint with `@typescript-eslint` and `eslint-plugin-import`
- **Formatting**: Prettier with a shared `.prettierrc` at the root
- **Git hooks**: Husky + lint-staged (lint and format on pre-commit)
- **Commit convention**: Commitlint with conventional commits (`feat`, `fix`, `chore`, etc.)
- **Environment variables**: `dotenv` in the API; `.env.example` files committed for both apps

### `packages/shared`

Create a shared library with:

- All domain TypeScript types (migrate from `src/types/domain.ts`):
  - `Role`, `Product`, `Store`, `StoreInventoryItem`, `InventoryTransaction`
  - `CustomerOrder`, `CustomerOrderItem`
  - `ReorderRequest`, `ReorderRequestItem`
  - `ShippingOrder`, `ShippingOrderItem`
- Enums for status values: `ShippingStatus`, `ReorderStatus`, `MovementType`, `ProductCategory`, `Priority`
- Shared validation constants (e.g. `REORDER_STATUSES`, `SHIPPING_STATUSES`)
- Build output: ESM + CJS via `tsup`

### `apps/web` (Frontend)

- Vite + React 19 + TypeScript
- Path aliases: `@/` → `src/`
- Absolute imports configured in `tsconfig` and `vite.config.ts`
- Base folder structure:
  ```
  src/
  ├── assets/
  ├── components/       # Shared UI components
  ├── features/         # Feature-scoped modules (store/, warehouse/)
  ├── hooks/            # Shared custom hooks
  ├── lib/              # Utility functions, API client config
  ├── routes/           # Route-level page components
  ├── state/            # Global client state (Zustand)
  └── types/            # Frontend-only types (re-export from shared)
  ```
- Install base dependencies: `react-router-dom`, `@tanstack/react-query`, `zustand`, `axios`
- Install dev dependencies: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `msw`
- Proxy `/api` to `http://localhost:3000` via `vite.config.ts` during development

### `apps/api` (Backend)

- Node.js + Express + TypeScript compiled with `tsc` (or `tsx` for dev with `nodemon`)
- Folder structure:
  ```
  src/
  ├── config/           # App config, env validation (zod)
  ├── db/               # Database client and migrations
  ├── middleware/        # Auth, error handling, request logging
  ├── modules/          # Feature-scoped route handlers and services
  │   ├── auth/
  │   ├── products/
  │   ├── stores/
  │   ├── inventory/
  │   ├── orders/
  │   ├── reorder-requests/
  │   └── shipping/
  ├── types/            # Express augmentations, shared re-exports
  └── index.ts          # App entry point
  ```
- Install base dependencies: `express`, `cors`, `helmet`, `zod`, `dotenv`, `pg`, `@prisma/client`
- Install dev dependencies: `typescript`, `ts-node`, `nodemon`, `@types/express`, `@types/cors`, `prisma`, `vitest`, `supertest`
- Validate all environment variables at startup using `zod`

### Turborepo Pipeline (`turbo.json`)

Define the following tasks:

```json
{
  "pipeline": {
    "build": {"dependsOn": ["^build"], "outputs": ["dist/**"]},
    "dev": {"cache": false, "persistent": true},
    "lint": {},
    "test": {"outputs": []},
    "typecheck": {}
  }
}
```

### Root `package.json` Scripts

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "format": "prettier --write ."
  }
}
```

### `.env.example` for `apps/api`

```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/inventory_db
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=1d
CORS_ORIGIN=http://localhost:5173
```

### `.env.example` for `apps/web`

```
VITE_API_BASE_URL=http://localhost:3000
```

## Acceptance Criteria

- [ ] `pnpm install` at the root installs all workspaces
- [ ] `pnpm dev` starts both `apps/web` and `apps/api` concurrently via Turborepo
- [ ] `pnpm build` builds all packages in dependency order
- [ ] `pnpm lint` and `pnpm typecheck` run across all packages with zero errors
- [ ] Shared types from `packages/shared` are importable in both `apps/web` and `apps/api`
- [ ] Husky pre-commit hook runs lint-staged successfully
- [ ] Commitlint rejects non-conventional commit messages
