# AI Assistant Guide

## Critical Rules

1. **No code comments** - no `//` or `/* */`. Use self-documenting names. Remove comments during refactoring
2. **No AI attribution in commits** - no `Co-Authored-By`, no `Generated with`, nothing
3. **TypeScript only** - `allowJs: false`. Never create `.js` files. All source must be `.ts` or `.tsx`
4. **100% ESM** - `"type": "module"`. No CommonJS (`require`, `module.exports`)
5. **pnpm only** - never use npm or yarn
6. **DRY** - always search for existing implementations before writing new code. Reuse and enhance, never duplicate
7. **File ops free, git ops require permission** - never commit or push without explicit user request

## Project Overview

- **Architecture**: T3 Stack - Next.js 15 (App Router) + tRPC 11 + Prisma (MongoDB Atlas) + NextAuth 5
- **Repository**: https://github.com/nbarrett/safari-track
- **Node.js**: >= 22
- **Package Manager**: pnpm
- **Deployment**: Fly.io (region: jnb, org: annix)
- **CI/CD**: GitHub Actions

### Key Directories

| Path | Purpose |
|------|---------|
| `src/app/` | Next.js App Router pages and layouts |
| `src/app/_components/` | Shared React components |
| `src/app/api/` | API route handlers (NextAuth, tRPC) |
| `src/server/api/routers/` | tRPC routers (checklist, drive, sighting, species) |
| `src/server/api/trpc.ts` | tRPC context, middleware, procedure types |
| `src/server/auth/` | NextAuth 5 configuration (credentials + JWT) |
| `src/server/db.ts` | Prisma client singleton |
| `src/trpc/` | tRPC client setup (React Query integration) |
| `src/styles/globals.css` | Tailwind CSS 4 theme (brand colours) |
| `src/env.ts` | Environment variable validation (Zod) |
| `prisma/schema.prisma` | MongoDB schema (6 models) |
| `prisma/seed.ts` | Seed data (243 species, 3 lodges, admin user) |
| `generated/prisma/` | Generated Prisma client (gitignored) |

## Code Style

- **Double quotes** always, never single quotes
- **`null` not `undefined`** for absence of value
- **`T[]` not `Array<T>`**
- **Immutable operations** - prefer `map`/`reduce`/`filter` over mutation
- **UK English** in commits and docs ("centralised", "colour", "behaviour")
- **Minimal changes** - keep patches targeted and scoped
- **Path alias** - use `~/` for imports from `src/` (e.g., `import { db } from "~/server/db"`)
- **Server components by default** - only add `"use client"` when hooks or interactivity are needed

## TypeScript

- **Strict mode** with `noUncheckedIndexedAccess`
- **`verbatimModuleSyntax`** - use `import type` for type-only imports
- **Target**: ES2022
- **Module**: ESNext with Bundler resolution

## React / Next.js Patterns

- **App Router** - all pages under `src/app/`, use file-based routing
- **Server Components** are the default; use `"use client"` only when required
- **Server-side auth** - use `await auth()` in server components, `useSession()` in client components
- **`publicProcedure`** for guest-accessible endpoints, **`protectedProcedure`** for authenticated
- **Metadata** - export `metadata` from layout/page files for SEO
- **Loading states** - handle `status === "loading"` from `useSession()` before rendering

## tRPC Patterns

- Routers live in `src/server/api/routers/`
- Register new routers in `src/server/api/root.ts`
- Use Zod schemas for all procedure inputs
- Client usage: `api.<router>.<procedure>.useQuery()` / `.useMutation()`
- Invalidate queries after mutations via `api.useUtils()`

## Database (Prisma + MongoDB)

- Schema at `prisma/schema.prisma`
- Prisma client generates to `./generated/prisma`
- All IDs use `@id @default(auto()) @map("_id") @db.ObjectId`
- Use `upsert` for idempotent seed operations
- Push schema changes: `pnpm db:push`
- Open GUI: `pnpm db:studio`

## Styling (Tailwind CSS 4)

- Global theme in `src/styles/globals.css` using `@theme` block
- Brand colours: `brand-brown`, `brand-khaki`, `brand-gold`, `brand-green`, `brand-cream`, `brand-dark`, `brand-teal`
- PostCSS config must be `.mjs` (not `.ts`) for Turbopack compatibility
- Mobile-first design - this is primarily a mobile web app for guides, guests, and lodge staff in the field

## Authentication

- NextAuth 5 with credentials provider (email + bcrypt password)
- JWT session strategy (no session database table)
- Session includes: `id`, `role` (ADMIN/GUIDE/VIEWER), `lodgeId`
- Custom sign-in page at `/auth/signin`
- No middleware - auth is checked per-page (server-side `auth()` or client-side `useSession()`)

## Git Workflow

- **Conventional commits**: `<type>(<scope>): <description>` (feat, fix, refactor, test, docs, style, build, ci)
- **Pre-push hook** runs typecheck on pushes to `main`/`pre-main`
- **Hook setup**: `.githooks/` directory, configure with `git config core.hooksPath .githooks`

## Error Handling

- No empty catch blocks - always log or return a safe default
- Prefer small, targeted try/catch blocks
- Use tRPC error codes (`UNAUTHORIZED`, `NOT_FOUND`, `BAD_REQUEST`) in routers

## Commands

```bash
pnpm dev              # Dev server (Turbopack)
pnpm build            # Production build
pnpm start            # Production server
pnpm typecheck        # Type checking
pnpm db:push          # Push schema to MongoDB
pnpm db:seed          # Seed species + admin user
pnpm db:studio        # Prisma Studio GUI
```

## Cross-Platform Dev Scripts

```bash
./run-dev.sh          # macOS/Linux start
./kill-dev.sh         # macOS/Linux stop
.\run-dev.ps1         # Windows PowerShell start
.\kill-dev.ps1        # Windows PowerShell stop
run-dev.bat           # Windows CMD start
```
