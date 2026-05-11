# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # Start dev server with Turbopack
bun build        # Production build
bun check        # Lint + typecheck (run before every commit)
bun typecheck    # TypeScript check only (tsc --noEmit)
bun lint         # ESLint
bun lint:fix     # ESLint with auto-fix
bun format:write # Prettier format

# Database
bun db:push      # Push schema changes (dev, no migration files)
bun db:generate  # Generate migration files
bun db:migrate   # Run migrations
bun db:studio    # Drizzle Studio GUI
```

No test runner is configured.

## Environment Setup

Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL` — defaults to `file:./db.sqlite` for local SQLite
- `BETTER_AUTH_GITHUB_CLIENT_ID` / `BETTER_AUTH_GITHUB_CLIENT_SECRET` — required even in dev
- `BETTER_AUTH_SECRET` — optional in dev, required in production

Adding new env vars: update the schema in `src/env.js`, the `runtimeEnv` map, and `.env.example`.

Skip env validation during builds: `SKIP_ENV_VALIDATION=1 bun build`

## Architecture

**T3 Stack**: Next.js 15 App Router + tRPC + Drizzle ORM + Better Auth + Tailwind v4. Runtime is Bun. Path alias `~/` maps to `src/`.

### Route structure

```
src/app/
  page.tsx              # Sign-in page (public, redirects to /dashboard if authed)
  layout.tsx            # Root layout (fonts, metadata)
  (app)/                # Route group — all routes here require auth
    layout.tsx          # Session guard: calls getSession(), redirects to / if null. Renders Sidebar + <main>.
    dashboard/page.tsx  # Dashboard overview (server component)
  api/
    auth/[...all]/      # Better Auth handler
    trpc/[trpc]/        # tRPC HTTP handler
```

New authenticated routes go inside `src/app/(app)/`. The `(app)/layout.tsx` session guard covers them automatically.

### Data flow

- **tRPC** is the only API layer — never use `fetch()` to internal routes.
- Routers live in `src/server/api/routers/`. Register them in `src/server/api/root.ts`.
- tRPC context (`src/server/api/trpc.ts`) injects `db` and `session`. Use `protectedProcedure` for auth-gated endpoints — it guarantees `ctx.session.user` is non-null.
- **Server components**: import `api` from `~/trpc/server` and call directly (no HTTP). Prefetch with `void api.xxx.prefetch()` then wrap with `<HydrateClient>`.
- **Client components**: import `api` from `~/trpc/react` (React Query).

### Auth

**Better Auth** (not NextAuth). Config: `src/server/better-auth/config.ts`. GitHub OAuth + email/password are enabled.

```ts
// Server component or layout — session retrieval
import { getSession } from "~/server/better-auth/server";
const session = await getSession();
if (!session) redirect("/");

// Client component — auth actions
import { authClient } from "~/server/better-auth/client";
void authClient.signIn.social({ provider: "github", callbackURL: "/dashboard" });
void authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/"; } } });
```

Never call `authClient` from a server component.

### Database

Drizzle ORM with libSQL (SQLite-compatible). Schema: `src/server/db/schema.ts`. DB client is a cached singleton — import from `~/server/db`.

Better Auth tables (`user`, `account`, `session`, `verification`) are defined manually in schema, not auto-generated. Keep them in sync when upgrading Better Auth.

The `posts` table in schema is T3 boilerplate — remove it when building real features.

### Server vs. client components

Default to server components. Use `"use client"` only when the component needs: event handlers, React hooks, `authClient` calls, `usePathname`/`useRouter`.

## Design system

Tailwind v4 with custom tokens defined in `src/styles/globals.css` using `@theme inline`. shadcn/ui (radix-nova style, hugeicons) is installed — components in `src/components/ui/`.

**Always use token classes. Never write raw hex values inline.**

| Role | Class |
|---|---|
| Page background | `bg-slate-grey-950` |
| Sidebar background | `bg-mauve-shadow-950` |
| Card surface | `bg-slate-grey-900` |
| Card border | `border-dusty-lavender-800` |
| Primary accent | `text-midnight-violet-500` / `bg-midnight-violet-500` |
| Secondary accent | `text-mauve-shadow-500` / `bg-mauve-shadow-500` |
| Primary text | `text-slate-grey-50` |
| Muted text | `text-dusty-lavender-400` |
| Success (income, positive) | `text-success` / `bg-success` |
| Danger (over-budget, error) | `text-danger` / `bg-danger` |
| Glow shadow | `#93065b` — only in inline `box-shadow` where arbitrary values are needed |

Card hover glow pattern: `hover:shadow-[0_0_24px_0px_#93065b33]`

shadcn `Card` components (`Card`, `CardHeader`, `CardContent`, `CardTitle`) are the standard for all card surfaces. Override color tokens with className props: `className="border-dusty-lavender-800 bg-slate-grey-900"`.

There is no light/dark mode toggle — the design is dark-only. All CSS variables in `:root` are set to dark values directly.
