# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # Start dev server with Turbopack
bun build        # Production build
bun check        # Lint + typecheck
bun typecheck    # TypeScript check only (tsc --noEmit)
bun lint         # ESLint
bun lint:fix     # ESLint with auto-fix
bun format:write # Prettier format

# Database
bun db:push      # Push schema changes (dev)
bun db:generate  # Generate migration files
bun db:migrate   # Run migrations
bun db:studio    # Drizzle Studio GUI
```

No test runner is configured yet.

## Environment Setup

Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL` — defaults to `file:./db.sqlite` for local SQLite
- `BETTER_AUTH_GITHUB_CLIENT_ID` / `BETTER_AUTH_GITHUB_CLIENT_SECRET` — required even in dev
- `BETTER_AUTH_SECRET` — optional in dev, required in production

Skip env validation during builds: `SKIP_ENV_VALIDATION=1 bun build`

## Architecture

This is a **T3 Stack** app (Next.js 15 App Router + tRPC + Drizzle + Better Auth + Tailwind v4).

### Data flow

- **tRPC** is the API layer. All routers live in `src/server/api/routers/`. Add new routers there and register them in `src/server/api/root.ts`.
- The tRPC context (`src/server/api/trpc.ts`) injects `db` and `session` into every request. Use `publicProcedure` for open endpoints and `protectedProcedure` for auth-gated ones — `protectedProcedure` guarantees `ctx.session.user` is non-null.
- Server components call tRPC via `src/trpc/server.ts` (direct caller, no HTTP). Client components use `api` from `src/trpc/react.tsx` (React Query under the hood).
- Prefetch data in server components with `void api.xxx.prefetch()`, then wrap the subtree with `<HydrateClient>` to hand hydrated state to client components.

### Auth

**Better Auth** (not NextAuth) handles authentication. Config is in `src/server/better-auth/config.ts`. GitHub OAuth and email/password are enabled. Session retrieval on the server uses `getSession()` from `src/server/better-auth/server.ts`. The auth route handler is mounted at `src/app/api/auth/[...all]/route.ts`.

### Database

**Drizzle ORM** with **libSQL** (SQLite-compatible). Schema is in `src/server/db/schema.ts`. The DB client is a cached singleton to survive HMR in dev. Better Auth tables (`user`, `account`, `session`, `verification`) are defined manually in schema rather than auto-generated — keep them in sync if upgrading Better Auth.

### Environment validation

`src/env.js` uses `@t3-oss/env-nextjs` to validate env vars at build/startup. Add new env vars to both the schema in `src/env.js` and the `runtimeEnv` map, then update `.env.example`.

### Path aliases

`~/*` maps to `src/*` (configured in `tsconfig.json`).
