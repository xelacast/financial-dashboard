# Finance Dashboard — Initial Shell & Dashboard Design

**Date:** 2026-05-11
**Scope:** Remove T3 boilerplate, establish authenticated app shell, build dashboard overview page.

---

## Overview

Personal finance tracking app. First milestone delivers a clean authenticated shell with a dashboard overview showing net worth, monthly spending, budget status, and recent transactions. All data is placeholder — no new DB schema in this iteration.

---

## Color System

| Role | Token | Hex |
|---|---|---|
| Page background | `slate-grey-950` | `#101214` |
| Sidebar background | `mauve-shadow-950` | `#160e11` |
| Card surface | `slate-grey-900` | `#16191d` |
| Card border | `dusty-lavender-800` | `#372d39` |
| Primary accent | `midnight-violet-500` | `#f50a97` |
| Secondary accent | `mauve-shadow-500` | `#9e6178` |
| Primary text | `slate-grey-50` | `#f1f2f4` |
| Muted text | `dusty-lavender-400` | `#a28ea4` |
| Glow/shadow | `midnight-violet-700` at low opacity | `#93065b` |

All CSS custom properties are defined in `src/styles/globals.css`. Tailwind references them via `@theme`.

---

## Routing Structure

```
src/app/
  page.tsx                  ← sign-in page (unauthenticated, no shell)
  (app)/
    layout.tsx              ← authenticated shell (session guard + sidebar)
    dashboard/
      page.tsx              ← dashboard overview
```

- `(app)/layout.tsx` reads session server-side. No session → `redirect("/")`.
- After GitHub OAuth sign-in, `callbackURL` is `/dashboard`.
- The `(app)` route group means the sign-in page keeps its own full-page layout.

---

## Sign-In Page (`/`)

- Full viewport, `slate-grey-950` background.
- Centered card (`slate-grey-900`, `dusty-lavender-800` border).
- App name at top in `slate-grey-50`.
- Single "Sign in with GitHub" button using `authClient.signIn.social()` with `midnight-violet-500` accent.
- Already-signed-in users are redirected to `/dashboard` by the shell layout.

---

## App Shell

### Sidebar (240px fixed, full height)

Three zones:

**Brand (top)**
- App name "Fintrack" in `slate-grey-50`.
- Bottom border `dusty-lavender-800`.

**Navigation (middle, flex-grow)**

| Link | State |
|---|---|
| Dashboard | Active — real route |
| Transactions | Dimmed, non-clickable (coming soon) |
| Budgets | Dimmed, non-clickable (coming soon) |
| Accounts | Dimmed, non-clickable (coming soon) |
| Goals | Dimmed, non-clickable (coming soon) |

- Active: `midnight-violet-500` left border + text + `mauve-shadow-950` background pill.
- Inactive: `dusty-lavender-400` text, hover → `slate-grey-50`.

**User (bottom)**
- Avatar initial circle + user name + email.
- Sign Out button using `authClient.signOut()` with `window.location.href = "/"` on success.
- Top border `dusty-lavender-800`.

### Main Content Area
- Remaining viewport width, `slate-grey-950` background.
- Scrollable, `p-8` padding.

---

## Dashboard Page (`/dashboard`)

### Layer 1 — Header
- "Good morning, [first name]" in large `slate-grey-50`.
- Current date (e.g. "Sunday, May 11") in `dusty-lavender-400`.

### Layer 2 — Summary Cards (2×2 grid)

All cards: `slate-grey-900` bg, `dusty-lavender-800` border, `midnight-violet-700` glow on hover.
Key numbers: `slate-grey-50`. Labels: `dusty-lavender-400`.

| Card | Primary Value | Secondary |
|---|---|---|
| Net Worth | `$0.00` placeholder | MoM delta (green/red) |
| Monthly Spending | `$0.00` placeholder | Progress bar vs. budget |
| Budget Status | `—` | X of Y categories on track |
| Savings Rate | `0%` | vs. last month delta |

### Layer 3 — Two-Column Section

**Recent Transactions (60%)**
- Table-style list: date, merchant name, category chip, amount.
- Amounts: `slate-grey-50`. Category chips: `mauve-shadow-500` background, small text.
- 5 placeholder rows.

**Budget Progress (40%)**
- Vertical list of budget categories.
- Each row: label, `$spent / $limit`, progress bar.
- Bar fill: `midnight-violet-500`. Over-budget: red.
- 4 placeholder categories.

---

## Components

| File | Purpose |
|---|---|
| `src/app/page.tsx` | Sign-in page (rewritten, no boilerplate) |
| `src/app/_components/auth-buttons.tsx` | `SignInButton` (already exists, update callbackURL) |
| `src/app/(app)/layout.tsx` | Shell layout with session guard |
| `src/app/(app)/_components/sidebar.tsx` | Sidebar with nav + user zone |
| `src/app/(app)/dashboard/page.tsx` | Dashboard overview |
| `src/app/(app)/dashboard/_components/stat-card.tsx` | Reusable summary card |
| `src/styles/globals.css` | Color custom properties + Tailwind theme |

---

## Out of Scope (This Iteration)

- Real financial data, DB schema changes, tRPC mutations.
- Transactions, Budgets, Accounts, Goals pages.
- Charts or graphs.
- Mobile responsiveness beyond basic grid collapse.
- Dark/light mode toggle.
