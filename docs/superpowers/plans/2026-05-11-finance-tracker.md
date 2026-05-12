# Finance Month-to-Month Tracker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Implementation agent:** Use the `senior-developer` subagent for each task.
> **Docs:** Use Context7 (`mcp__plugin_context7_context7__resolve-library-id` + `mcp__plugin_context7_context7__query-docs`) before touching Drizzle ORM, tRPC, or Next.js App Router APIs.
>
> **No test runner is configured** — skip test steps. Verify each task by running `bun dev` and checking in the browser instead.

**Goal:** Build a month-to-month personal finance simulation with a year overview strip, per-month income/expense checklists, hypothetical what-if toggles, account balances, and a configuration page for recurring templates.

**Architecture:** New `/tracker` route with a server page component that prefetches data via tRPC and passes it to a client-heavy layout. Two new tRPC routers (`tracker`, `config`) back all mutations. Five new DB tables store financial data scoped per user.

**Tech Stack:** Next.js 15 App Router, tRPC v11, Drizzle ORM (SQLite/libSQL), Tailwind v4, shadcn/ui, Better Auth, Bun, Zod

---

## File Map

**New files:**
- `src/server/db/schema.ts` — modified: add 5 new tables
- `src/server/api/routers/config.ts` — CRUD for financial accounts, recurring templates, debts
- `src/server/api/routers/tracker.ts` — month entries, line items, year view, copy-last-month
- `src/server/api/root.ts` — modified: register both new routers
- `src/app/(app)/_components/sidebar.tsx` — modified: add Tracker nav link
- `src/app/(app)/tracker/page.tsx` — server component, prefetches + renders tracker shell
- `src/app/(app)/tracker/_components/tracker-content.tsx` — client root, wires year+month views
- `src/app/(app)/tracker/_components/year-overview.tsx` — 12-month strip with year nav
- `src/app/(app)/tracker/_components/month-header-stats.tsx` — two key stat cards
- `src/app/(app)/tracker/_components/line-item-row.tsx` — single income/expense row with controls
- `src/app/(app)/tracker/_components/account-balances-panel.tsx` — account balances + net worth
- `src/app/(app)/tracker/_components/category-breakdown-panel.tsx` — per-category spend summary
- `src/app/(app)/tracker/_components/month-detail.tsx` — composes all month-level components
- `src/app/(app)/tracker/config/page.tsx` — server component for config route
- `src/app/(app)/tracker/config/_components/config-content.tsx` — client root for config
- `src/app/(app)/tracker/config/_components/template-section.tsx` — recurring templates CRUD
- `src/app/(app)/tracker/config/_components/account-section.tsx` — financial accounts CRUD
- `src/app/(app)/tracker/config/_components/debt-section.tsx` — debts CRUD

---

## Task 1: Add DB tables to schema

**Files:**
- Modify: `src/server/db/schema.ts`

- [ ] **Step 1: Add 5 new tables to the schema**

Open `src/server/db/schema.ts`. Add `uniqueIndex` to the import and append the five new tables at the bottom:

```ts
import { relations, sql } from "drizzle-orm";
import { index, sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";
```

Then at the bottom of the file, after the existing tables:

```ts
// ── Finance Tracker ──────────────────────────────────────────────────────────

export const financialAccount = sqliteTable(
  "financial_account",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: d.text({ length: 255 }).notNull().references(() => user.id),
    name: d.text({ length: 255 }).notNull(),
    type: d.text({ length: 50 }).notNull(), // checking | savings | credit_card | loan
    balance: d.real().notNull().default(0),
    isDebt: d.integer({ mode: "boolean" }).notNull().default(false),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [index("financial_account_user_id_idx").on(t.userId)],
);

export const recurringTemplate = sqliteTable(
  "recurring_template",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: d.text({ length: 255 }).notNull().references(() => user.id),
    name: d.text({ length: 255 }).notNull(),
    type: d.text({ length: 50 }).notNull(), // expense | income
    defaultAmount: d.real().notNull().default(0),
    category: d.text({ length: 100 }).notNull().default(""),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [index("recurring_template_user_id_idx").on(t.userId)],
);

export const monthEntry = sqliteTable(
  "month_entry",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: d.text({ length: 255 }).notNull().references(() => user.id),
    year: d.integer({ mode: "number" }).notNull(),
    month: d.integer({ mode: "number" }).notNull(), // 1–12
    startingBalance: d.real().notNull().default(0),
    notes: d.text().notNull().default(""),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("month_entry_user_id_idx").on(t.userId),
    uniqueIndex("month_entry_user_year_month_uidx").on(
      t.userId,
      t.year,
      t.month,
    ),
  ],
);

export const lineItem = sqliteTable(
  "line_item",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    monthEntryId: d
      .text({ length: 255 })
      .notNull()
      .references(() => monthEntry.id, { onDelete: "cascade" }),
    userId: d.text({ length: 255 }).notNull().references(() => user.id),
    name: d.text({ length: 255 }).notNull(),
    type: d.text({ length: 50 }).notNull(), // expense | income
    amount: d.real().notNull().default(0),
    category: d.text({ length: 100 }).notNull().default(""),
    isChecked: d.integer({ mode: "boolean" }).notNull().default(false),
    isHypothetical: d.integer({ mode: "boolean" }).notNull().default(false),
    templateId: d
      .text({ length: 255 })
      .references(() => recurringTemplate.id, { onDelete: "set null" }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("line_item_month_entry_id_idx").on(t.monthEntryId),
    index("line_item_user_id_idx").on(t.userId),
  ],
);

export const debt = sqliteTable(
  "debt",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: d.text({ length: 255 }).notNull().references(() => user.id),
    name: d.text({ length: 255 }).notNull(),
    totalOwed: d.real().notNull().default(0),
    monthlyPayment: d.real().notNull().default(0),
    accountId: d
      .text({ length: 255 })
      .references(() => financialAccount.id, { onDelete: "set null" }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [index("debt_user_id_idx").on(t.userId)],
);
```

- [ ] **Step 2: Push schema to database**

```bash
bun db:push
```

Expected: prompts you to confirm table creation, then `✓ Changes applied`

- [ ] **Step 3: Verify with Drizzle Studio**

```bash
bun db:studio
```

Open the URL it prints. Confirm the five new tables appear: `financial_account`, `recurring_template`, `month_entry`, `line_item`, `debt`.

- [ ] **Step 4: Commit**

```bash
git add src/server/db/schema.ts
git commit -m "feat: add finance tracker DB tables (financial_account, recurring_template, month_entry, line_item, debt)"
```

---

## Task 2: Config tRPC router

**Files:**
- Create: `src/server/api/routers/config.ts`
- Modify: `src/server/api/root.ts`

- [ ] **Step 1: Create the config router**

Create `src/server/api/routers/config.ts`:

```ts
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  debt,
  financialAccount,
  recurringTemplate,
} from "~/server/db/schema";

export const configRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [templates, accounts, debts] = await Promise.all([
      ctx.db
        .select()
        .from(recurringTemplate)
        .where(eq(recurringTemplate.userId, userId)),
      ctx.db
        .select()
        .from(financialAccount)
        .where(eq(financialAccount.userId, userId)),
      ctx.db.select().from(debt).where(eq(debt.userId, userId)),
    ]);
    return { templates, accounts, debts };
  }),

  upsertTemplate: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        type: z.enum(["expense", "income"]),
        defaultAmount: z.number().min(0),
        category: z.string().default(""),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (input.id) {
        await ctx.db
          .update(recurringTemplate)
          .set({
            name: input.name,
            type: input.type,
            defaultAmount: input.defaultAmount,
            category: input.category,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(recurringTemplate.id, input.id),
              eq(recurringTemplate.userId, userId),
            ),
          );
        return { id: input.id };
      }
      const id = crypto.randomUUID();
      await ctx.db.insert(recurringTemplate).values({
        id,
        userId,
        name: input.name,
        type: input.type,
        defaultAmount: input.defaultAmount,
        category: input.category,
      });
      return { id };
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(recurringTemplate)
        .where(
          and(
            eq(recurringTemplate.id, input.id),
            eq(recurringTemplate.userId, ctx.session.user.id),
          ),
        );
    }),

  upsertFinancialAccount: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        type: z.enum(["checking", "savings", "credit_card", "loan"]),
        balance: z.number(),
        isDebt: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (input.id) {
        await ctx.db
          .update(financialAccount)
          .set({
            name: input.name,
            type: input.type,
            balance: input.balance,
            isDebt: input.isDebt,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(financialAccount.id, input.id),
              eq(financialAccount.userId, userId),
            ),
          );
        return { id: input.id };
      }
      const id = crypto.randomUUID();
      await ctx.db.insert(financialAccount).values({
        id,
        userId,
        name: input.name,
        type: input.type,
        balance: input.balance,
        isDebt: input.isDebt,
      });
      return { id };
    }),

  deleteFinancialAccount: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(financialAccount)
        .where(
          and(
            eq(financialAccount.id, input.id),
            eq(financialAccount.userId, ctx.session.user.id),
          ),
        );
    }),

  upsertDebt: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        totalOwed: z.number().min(0),
        monthlyPayment: z.number().min(0),
        accountId: z.string().nullable().default(null),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (input.id) {
        await ctx.db
          .update(debt)
          .set({
            name: input.name,
            totalOwed: input.totalOwed,
            monthlyPayment: input.monthlyPayment,
            accountId: input.accountId,
            updatedAt: new Date(),
          })
          .where(
            and(eq(debt.id, input.id), eq(debt.userId, userId)),
          );
        return { id: input.id };
      }
      const id = crypto.randomUUID();
      await ctx.db.insert(debt).values({
        id,
        userId,
        name: input.name,
        totalOwed: input.totalOwed,
        monthlyPayment: input.monthlyPayment,
        accountId: input.accountId,
      });
      return { id };
    }),

  deleteDebt: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(debt)
        .where(
          and(
            eq(debt.id, input.id),
            eq(debt.userId, ctx.session.user.id),
          ),
        );
    }),
});
```

- [ ] **Step 2: Register the router in root.ts**

Replace the entire content of `src/server/api/root.ts`:

```ts
import { postRouter } from "~/server/api/routers/post";
import { configRouter } from "~/server/api/routers/config";
import { trackerRouter } from "~/server/api/routers/tracker";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  post: postRouter,
  config: configRouter,
  tracker: trackerRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
```

> Note: `trackerRouter` does not exist yet — TypeScript will error until Task 3 is complete. Create a stub file first if needed: `export const trackerRouter = createTRPCRouter({});` in `src/server/api/routers/tracker.ts`, then fill it in Task 3.

- [ ] **Step 3: Verify types**

```bash
bun typecheck
```

Expected: no errors (or only errors about missing tracker router, which the stub resolves)

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/config.ts src/server/api/root.ts
git commit -m "feat: add config tRPC router (financial accounts, templates, debts)"
```

---

## Task 3: Tracker tRPC router

**Files:**
- Create: `src/server/api/routers/tracker.ts`

- [ ] **Step 1: Create the tracker router**

Create `src/server/api/routers/tracker.ts`:

```ts
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { lineItem, monthEntry, recurringTemplate } from "~/server/db/schema";

export const trackerRouter = createTRPCRouter({
  // Returns all month entries for a year with aggregated line item totals.
  getYear: protectedProcedure
    .input(z.object({ year: z.number().int().min(2000).max(2100) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const entries = await ctx.db
        .select()
        .from(monthEntry)
        .where(
          and(eq(monthEntry.userId, userId), eq(monthEntry.year, input.year)),
        );

      const result = await Promise.all(
        entries.map(async (entry) => {
          const items = await ctx.db
            .select()
            .from(lineItem)
            .where(eq(lineItem.monthEntryId, entry.id));
          const realItems = items.filter((i) => !i.isHypothetical);
          const totalIncome = realItems
            .filter((i) => i.type === "income")
            .reduce((sum, i) => sum + i.amount, 0);
          const totalExpenses = realItems
            .filter((i) => i.type === "expense")
            .reduce((sum, i) => sum + i.amount, 0);
          const checkedIncome = realItems
            .filter((i) => i.type === "income" && i.isChecked)
            .reduce((sum, i) => sum + i.amount, 0);
          const checkedExpenses = realItems
            .filter((i) => i.type === "expense" && i.isChecked)
            .reduce((sum, i) => sum + i.amount, 0);
          return {
            ...entry,
            projectedCashFlow: totalIncome - totalExpenses,
            actualCashFlow: checkedIncome - checkedExpenses,
          };
        }),
      );

      return result;
    }),

  // Returns a single month entry with all line items. Auto-creates + populates
  // from recurring templates on first visit.
  getMonth: protectedProcedure
    .input(
      z.object({
        year: z.number().int().min(2000).max(2100),
        month: z.number().int().min(1).max(12),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      let entry = await ctx.db.query.monthEntry.findFirst({
        where: and(
          eq(monthEntry.userId, userId),
          eq(monthEntry.year, input.year),
          eq(monthEntry.month, input.month),
        ),
      });

      if (!entry) {
        const id = crypto.randomUUID();
        await ctx.db.insert(monthEntry).values({
          id,
          userId,
          year: input.year,
          month: input.month,
          startingBalance: 0,
          notes: "",
        });

        const templates = await ctx.db
          .select()
          .from(recurringTemplate)
          .where(eq(recurringTemplate.userId, userId));

        if (templates.length > 0) {
          await ctx.db.insert(lineItem).values(
            templates.map((t) => ({
              id: crypto.randomUUID(),
              monthEntryId: id,
              userId,
              name: t.name,
              type: t.type,
              amount: t.defaultAmount,
              category: t.category,
              isChecked: false,
              isHypothetical: false,
              templateId: t.id,
            })),
          );
        }

        entry = await ctx.db.query.monthEntry.findFirst({
          where: eq(monthEntry.id, id),
        });
      }

      const items = await ctx.db
        .select()
        .from(lineItem)
        .where(eq(lineItem.monthEntryId, entry!.id));

      return { entry: entry!, items };
    }),

  updateMonthEntry: protectedProcedure
    .input(
      z.object({
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
        startingBalance: z.number().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const entry = await ctx.db.query.monthEntry.findFirst({
        where: and(
          eq(monthEntry.userId, userId),
          eq(monthEntry.year, input.year),
          eq(monthEntry.month, input.month),
        ),
      });
      if (!entry) throw new Error("Month entry not found");

      await ctx.db
        .update(monthEntry)
        .set({
          ...(input.startingBalance !== undefined && {
            startingBalance: input.startingBalance,
          }),
          ...(input.notes !== undefined && { notes: input.notes }),
          updatedAt: new Date(),
        })
        .where(eq(monthEntry.id, entry.id));
    }),

  upsertLineItem: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        monthEntryId: z.string(),
        name: z.string().min(1),
        type: z.enum(["expense", "income"]),
        amount: z.number().min(0),
        category: z.string().default(""),
        isChecked: z.boolean().default(false),
        isHypothetical: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (input.id) {
        await ctx.db
          .update(lineItem)
          .set({
            name: input.name,
            type: input.type,
            amount: input.amount,
            category: input.category,
            isChecked: input.isChecked,
            isHypothetical: input.isHypothetical,
            updatedAt: new Date(),
          })
          .where(
            and(eq(lineItem.id, input.id), eq(lineItem.userId, userId)),
          );
        return { id: input.id };
      }
      const id = crypto.randomUUID();
      await ctx.db.insert(lineItem).values({
        id,
        monthEntryId: input.monthEntryId,
        userId,
        name: input.name,
        type: input.type,
        amount: input.amount,
        category: input.category,
        isChecked: input.isChecked,
        isHypothetical: input.isHypothetical,
      });
      return { id };
    }),

  deleteLineItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(lineItem)
        .where(
          and(
            eq(lineItem.id, input.id),
            eq(lineItem.userId, ctx.session.user.id),
          ),
        );
    }),

  // Copies all line items from the previous month into the current month.
  // Only runs if the target month entry is empty (no line items).
  copyLastMonth: protectedProcedure
    .input(
      z.object({
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const prevYear = input.month === 1 ? input.year - 1 : input.year;
      const prevMonth = input.month === 1 ? 12 : input.month - 1;

      const [currentEntry, prevEntry] = await Promise.all([
        ctx.db.query.monthEntry.findFirst({
          where: and(
            eq(monthEntry.userId, userId),
            eq(monthEntry.year, input.year),
            eq(monthEntry.month, input.month),
          ),
        }),
        ctx.db.query.monthEntry.findFirst({
          where: and(
            eq(monthEntry.userId, userId),
            eq(monthEntry.year, prevYear),
            eq(monthEntry.month, prevMonth),
          ),
        }),
      ]);

      if (!currentEntry || !prevEntry) return;

      const existingItems = await ctx.db
        .select()
        .from(lineItem)
        .where(eq(lineItem.monthEntryId, currentEntry.id));

      if (existingItems.length > 0) return; // only copy into empty months

      const prevItems = await ctx.db
        .select()
        .from(lineItem)
        .where(eq(lineItem.monthEntryId, prevEntry.id));

      if (prevItems.length === 0) return;

      await ctx.db.insert(lineItem).values(
        prevItems.map((item) => ({
          id: crypto.randomUUID(),
          monthEntryId: currentEntry.id,
          userId,
          name: item.name,
          type: item.type,
          amount: item.amount,
          category: item.category,
          isChecked: false,
          isHypothetical: item.isHypothetical,
          templateId: item.templateId,
        })),
      );
    }),
});
```

- [ ] **Step 2: Update `monthEntry` query to use Drizzle relational queries**

The `getMonth` procedure uses `ctx.db.query.monthEntry.findFirst`. This requires the relational query builder to be configured. Open `src/server/db/index.ts` and check if it uses `drizzle` with a `schema` option. If not, the query style needs to change to use `select`.

If `src/server/db/index.ts` uses the basic `drizzle(client)` without a schema, replace the two `findFirst` calls in the router with the `.select().from().where()` pattern:

```ts
// Replace ctx.db.query.monthEntry.findFirst({ where: ... })
// with:
const [entry] = await ctx.db
  .select()
  .from(monthEntry)
  .where(
    and(
      eq(monthEntry.userId, userId),
      eq(monthEntry.year, input.year),
      eq(monthEntry.month, input.month),
    ),
  )
  .limit(1);
```

Apply the same pattern for all `findFirst` calls in the tracker router.

- [ ] **Step 3: Typecheck**

```bash
bun typecheck
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/tracker.ts src/server/api/root.ts
git commit -m "feat: add tracker tRPC router (month entries, line items, year view)"
```

---

## Task 4: Add Tracker link to sidebar

**Files:**
- Modify: `src/app/(app)/_components/sidebar.tsx`

- [ ] **Step 1: Add Tracker to NAV_LINKS**

In `src/app/(app)/_components/sidebar.tsx`, update `NAV_LINKS`:

```ts
const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard", active: true },
  { label: "Tracker", href: "/tracker", active: true },
  { label: "Transactions", href: "#", active: false },
  { label: "Budgets", href: "#", active: false },
  { label: "Accounts", href: "#", active: false },
  { label: "Goals", href: "#", active: false },
] as const;
```

Also update the `isCurrent` logic — currently it checks `active && pathname === href`, which uses the `active` field as a guard. Since Tracker is now `active: true`, the existing logic will correctly highlight it when `pathname === "/tracker"`. No other changes needed.

- [ ] **Step 2: Verify in browser**

Run `bun dev`. Navigate to `/dashboard`. Confirm "Tracker" appears in the sidebar as a real link (not dimmed). Click it — it will 404 for now since the page doesn't exist yet. That's expected.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/_components/sidebar.tsx
git commit -m "feat: add Tracker nav link to sidebar"
```

---

## Task 5: Config page

**Files:**
- Create: `src/app/(app)/tracker/config/page.tsx`
- Create: `src/app/(app)/tracker/config/_components/config-content.tsx`
- Create: `src/app/(app)/tracker/config/_components/template-section.tsx`
- Create: `src/app/(app)/tracker/config/_components/account-section.tsx`
- Create: `src/app/(app)/tracker/config/_components/debt-section.tsx`

- [ ] **Step 1: Create the server page**

Create `src/app/(app)/tracker/config/page.tsx`:

```tsx
import { HydrateClient, api } from "~/trpc/server";
import { ConfigContent } from "./_components/config-content";

export default async function TrackerConfigPage() {
  void api.config.getAll.prefetch();

  return (
    <HydrateClient>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-grey-50">
            Tracker Configuration
          </h1>
          <p className="mt-1 text-sm text-dusty-lavender-400">
            Manage your recurring templates, accounts, and debts
          </p>
        </div>
        <ConfigContent />
      </div>
    </HydrateClient>
  );
}
```

- [ ] **Step 2: Create ConfigContent client root**

Create `src/app/(app)/tracker/config/_components/config-content.tsx`:

```tsx
"use client";

import { api } from "~/trpc/react";
import { TemplateSection } from "./template-section";
import { AccountSection } from "./account-section";
import { DebtSection } from "./debt-section";

export function ConfigContent() {
  const { data, isLoading } = api.config.getAll.useQuery();

  if (isLoading) {
    return (
      <div className="text-sm text-dusty-lavender-400">Loading config…</div>
    );
  }

  const templates = data?.templates ?? [];
  const accounts = data?.accounts ?? [];
  const debts = data?.debts ?? [];

  return (
    <div className="flex flex-col gap-10">
      <TemplateSection templates={templates} />
      <AccountSection accounts={accounts} />
      <DebtSection debts={debts} accounts={accounts} />
    </div>
  );
}
```

- [ ] **Step 3: Create TemplateSection**

Create `src/app/(app)/tracker/config/_components/template-section.tsx`:

```tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

type Template = {
  id: string;
  name: string;
  type: string;
  defaultAmount: number;
  category: string;
};

export function TemplateSection({ templates }: { templates: Template[] }) {
  const utils = api.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "expense" as "expense" | "income",
    defaultAmount: "",
    category: "",
  });

  const upsert = api.config.upsertTemplate.useMutation({
    onSuccess: async () => {
      await utils.config.getAll.invalidate();
      setShowForm(false);
      setEditingId(null);
      setForm({ name: "", type: "expense", defaultAmount: "", category: "" });
    },
  });

  const remove = api.config.deleteTemplate.useMutation({
    onSuccess: () => utils.config.getAll.invalidate(),
  });

  function startEdit(t: Template) {
    setEditingId(t.id);
    setForm({
      name: t.name,
      type: t.type as "expense" | "income",
      defaultAmount: String(t.defaultAmount),
      category: t.category,
    });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    upsert.mutate({
      id: editingId ?? undefined,
      name: form.name,
      type: form.type,
      defaultAmount: parseFloat(form.defaultAmount) || 0,
      category: form.category,
    });
  }

  return (
    <Card className="border-dusty-lavender-800 bg-slate-grey-900">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-slate-grey-50">
          Recurring Templates
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          className="border-dusty-lavender-800 text-dusty-lavender-400 hover:text-slate-grey-50"
          onClick={() => {
            setEditingId(null);
            setForm({ name: "", type: "expense", defaultAmount: "", category: "" });
            setShowForm(true);
          }}
        >
          + Add template
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="flex flex-wrap gap-2 rounded-lg border border-dusty-lavender-800 p-3"
          >
            <input
              className="rounded bg-slate-grey-950 px-2 py-1 text-sm text-slate-grey-50 outline-none"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <select
              className="rounded bg-slate-grey-950 px-2 py-1 text-sm text-slate-grey-50"
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value as "expense" | "income" }))
              }
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <input
              className="w-28 rounded bg-slate-grey-950 px-2 py-1 text-sm text-slate-grey-50 outline-none"
              placeholder="Amount"
              type="number"
              min="0"
              step="0.01"
              value={form.defaultAmount}
              onChange={(e) => setForm((f) => ({ ...f, defaultAmount: e.target.value }))}
            />
            <input
              className="rounded bg-slate-grey-950 px-2 py-1 text-sm text-slate-grey-50 outline-none"
              placeholder="Category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
            <Button size="sm" type="submit" disabled={upsert.isPending}>
              {editingId ? "Save" : "Add"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </form>
        )}

        {templates.length === 0 && !showForm && (
          <p className="text-sm text-dusty-lavender-400">
            No templates yet. Add one to auto-populate new months.
          </p>
        )}

        {templates.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-slate-grey-950"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-grey-50">
                {t.name}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  t.type === "income"
                    ? "bg-success/20 text-success"
                    : "bg-danger/20 text-danger"
                }`}
              >
                {t.type}
              </span>
              {t.category && (
                <span className="rounded-full bg-mauve-shadow-500/20 px-2 py-0.5 text-xs text-mauve-shadow-500">
                  {t.category}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-dusty-lavender-400">
                ${t.defaultAmount.toFixed(2)}
              </span>
              <button
                onClick={() => startEdit(t)}
                className="text-xs text-dusty-lavender-400 hover:text-slate-grey-50"
              >
                Edit
              </button>
              <button
                onClick={() => remove.mutate({ id: t.id })}
                className="text-xs text-danger hover:opacity-80"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Create AccountSection**

Create `src/app/(app)/tracker/config/_components/account-section.tsx`:

```tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

type FinancialAccount = {
  id: string;
  name: string;
  type: string;
  balance: number;
  isDebt: boolean;
};

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit_card", label: "Credit Card" },
  { value: "loan", label: "Loan" },
] as const;

export function AccountSection({ accounts }: { accounts: FinancialAccount[] }) {
  const utils = api.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "checking" as FinancialAccount["type"],
    balance: "",
    isDebt: false,
  });

  const upsert = api.config.upsertFinancialAccount.useMutation({
    onSuccess: async () => {
      await utils.config.getAll.invalidate();
      setShowForm(false);
      setEditingId(null);
      setForm({ name: "", type: "checking", balance: "", isDebt: false });
    },
  });

  const remove = api.config.deleteFinancialAccount.useMutation({
    onSuccess: () => utils.config.getAll.invalidate(),
  });

  function startEdit(a: FinancialAccount) {
    setEditingId(a.id);
    setForm({
      name: a.name,
      type: a.type,
      balance: String(a.balance),
      isDebt: a.isDebt,
    });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    upsert.mutate({
      id: editingId ?? undefined,
      name: form.name,
      type: form.type as "checking" | "savings" | "credit_card" | "loan",
      balance: parseFloat(form.balance) || 0,
      isDebt: form.isDebt,
    });
  }

  return (
    <Card className="border-dusty-lavender-800 bg-slate-grey-900">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-slate-grey-50">
          Accounts
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          className="border-dusty-lavender-800 text-dusty-lavender-400 hover:text-slate-grey-50"
          onClick={() => {
            setEditingId(null);
            setForm({ name: "", type: "checking", balance: "", isDebt: false });
            setShowForm(true);
          }}
        >
          + Add account
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-dusty-lavender-800 p-3"
          >
            <input
              className="rounded bg-slate-grey-950 px-2 py-1 text-sm text-slate-grey-50 outline-none"
              placeholder="Account name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <select
              className="rounded bg-slate-grey-950 px-2 py-1 text-sm text-slate-grey-50"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              className="w-28 rounded bg-slate-grey-950 px-2 py-1 text-sm text-slate-grey-50 outline-none"
              placeholder="Balance"
              type="number"
              step="0.01"
              value={form.balance}
              onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))}
            />
            <label className="flex items-center gap-1 text-sm text-dusty-lavender-400">
              <input
                type="checkbox"
                checked={form.isDebt}
                onChange={(e) => setForm((f) => ({ ...f, isDebt: e.target.checked }))}
              />
              Is debt
            </label>
            <Button size="sm" type="submit" disabled={upsert.isPending}>
              {editingId ? "Save" : "Add"}
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </form>
        )}

        {accounts.length === 0 && !showForm && (
          <p className="text-sm text-dusty-lavender-400">No accounts yet.</p>
        )}

        {accounts.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-slate-grey-950"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-grey-50">
                {a.name}
              </span>
              <span className="rounded-full bg-mauve-shadow-500/20 px-2 py-0.5 text-xs text-mauve-shadow-500">
                {ACCOUNT_TYPES.find((t) => t.value === a.type)?.label ?? a.type}
              </span>
              {a.isDebt && (
                <span className="rounded-full bg-danger/20 px-2 py-0.5 text-xs text-danger">
                  debt
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm ${a.isDebt ? "text-danger" : "text-slate-grey-50"}`}
              >
                {a.isDebt ? "-" : ""}${Math.abs(a.balance).toFixed(2)}
              </span>
              <button
                onClick={() => startEdit(a)}
                className="text-xs text-dusty-lavender-400 hover:text-slate-grey-50"
              >
                Edit
              </button>
              <button
                onClick={() => remove.mutate({ id: a.id })}
                className="text-xs text-danger hover:opacity-80"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Create DebtSection**

Create `src/app/(app)/tracker/config/_components/debt-section.tsx`:

```tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

type Debt = {
  id: string;
  name: string;
  totalOwed: number;
  monthlyPayment: number;
  accountId: string | null;
};

type FinancialAccount = { id: string; name: string };

export function DebtSection({
  debts,
  accounts,
}: {
  debts: Debt[];
  accounts: FinancialAccount[];
}) {
  const utils = api.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    totalOwed: "",
    monthlyPayment: "",
    accountId: "",
  });

  const upsert = api.config.upsertDebt.useMutation({
    onSuccess: async () => {
      await utils.config.getAll.invalidate();
      setShowForm(false);
      setEditingId(null);
      setForm({ name: "", totalOwed: "", monthlyPayment: "", accountId: "" });
    },
  });

  const remove = api.config.deleteDebt.useMutation({
    onSuccess: () => utils.config.getAll.invalidate(),
  });

  function startEdit(d: Debt) {
    setEditingId(d.id);
    setForm({
      name: d.name,
      totalOwed: String(d.totalOwed),
      monthlyPayment: String(d.monthlyPayment),
      accountId: d.accountId ?? "",
    });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    upsert.mutate({
      id: editingId ?? undefined,
      name: form.name,
      totalOwed: parseFloat(form.totalOwed) || 0,
      monthlyPayment: parseFloat(form.monthlyPayment) || 0,
      accountId: form.accountId || null,
    });
  }

  return (
    <Card className="border-dusty-lavender-800 bg-slate-grey-900">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-slate-grey-50">
          Debts
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          className="border-dusty-lavender-800 text-dusty-lavender-400 hover:text-slate-grey-50"
          onClick={() => {
            setEditingId(null);
            setForm({ name: "", totalOwed: "", monthlyPayment: "", accountId: "" });
            setShowForm(true);
          }}
        >
          + Add debt
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-dusty-lavender-800 p-3"
          >
            <input
              className="rounded bg-slate-grey-950 px-2 py-1 text-sm text-slate-grey-50 outline-none"
              placeholder="Name (e.g. Student Loan)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              className="w-28 rounded bg-slate-grey-950 px-2 py-1 text-sm text-slate-grey-50 outline-none"
              placeholder="Total owed"
              type="number"
              min="0"
              step="0.01"
              value={form.totalOwed}
              onChange={(e) => setForm((f) => ({ ...f, totalOwed: e.target.value }))}
            />
            <input
              className="w-28 rounded bg-slate-grey-950 px-2 py-1 text-sm text-slate-grey-50 outline-none"
              placeholder="Monthly payment"
              type="number"
              min="0"
              step="0.01"
              value={form.monthlyPayment}
              onChange={(e) => setForm((f) => ({ ...f, monthlyPayment: e.target.value }))}
            />
            {accounts.length > 0 && (
              <select
                className="rounded bg-slate-grey-950 px-2 py-1 text-sm text-slate-grey-50"
                value={form.accountId}
                onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
              >
                <option value="">No linked account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
            <Button size="sm" type="submit" disabled={upsert.isPending}>
              {editingId ? "Save" : "Add"}
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </form>
        )}

        {debts.length === 0 && !showForm && (
          <p className="text-sm text-dusty-lavender-400">No debts tracked yet.</p>
        )}

        {debts.map((d) => {
          const linkedAccount = accounts.find((a) => a.id === d.accountId);
          return (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-slate-grey-950"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-grey-50">
                  {d.name}
                </span>
                {linkedAccount && (
                  <span className="rounded-full bg-mauve-shadow-500/20 px-2 py-0.5 text-xs text-mauve-shadow-500">
                    {linkedAccount.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-danger">
                  Owed: ${d.totalOwed.toFixed(2)}
                </span>
                <span className="text-xs text-dusty-lavender-400">
                  ${d.monthlyPayment.toFixed(2)}/mo
                </span>
                <button
                  onClick={() => startEdit(d)}
                  className="text-xs text-dusty-lavender-400 hover:text-slate-grey-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove.mutate({ id: d.id })}
                  className="text-xs text-danger hover:opacity-80"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Verify config page in browser**

Run `bun dev`. Navigate to `/tracker/config`. Confirm:
- Three sections render (Recurring Templates, Accounts, Debts)
- "Add template" form opens and submits
- Saved templates appear in the list
- Edit and delete work for all three sections

- [ ] **Step 7: Commit**

```bash
git add src/app/\(app\)/tracker/config/
git commit -m "feat: add tracker config page (templates, accounts, debts)"
```

---

## Task 6: Year overview strip

**Files:**
- Create: `src/app/(app)/tracker/_components/year-overview.tsx`

- [ ] **Step 1: Create YearOverview component**

Create `src/app/(app)/tracker/_components/year-overview.tsx`:

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type MonthSummary = {
  month: number;
  projectedCashFlow: number;
  actualCashFlow: number;
  hasData: boolean;
};

type YearOverviewProps = {
  year: number;
  selectedMonth: number;
  months: MonthSummary[];
};

export function YearOverview({ year, selectedMonth, months }: YearOverviewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectMonth(month: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(year));
    params.set("month", String(month));
    router.push(`/tracker?${params.toString()}`);
  }

  function changeYear(delta: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(year + delta));
    params.set("month", String(selectedMonth));
    router.push(`/tracker?${params.toString()}`);
  }

  const monthMap = new Map(months.map((m) => [m.month, m]));

  return (
    <div className="flex flex-col gap-3">
      {/* Year navigator */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => changeYear(-1)}
          className="text-dusty-lavender-400 hover:text-slate-grey-50"
        >
          ←
        </button>
        <span className="text-sm font-semibold text-slate-grey-50">{year}</span>
        <button
          onClick={() => changeYear(1)}
          className="text-dusty-lavender-400 hover:text-slate-grey-50"
        >
          →
        </button>
      </div>

      {/* 12 month cards */}
      <div className="grid grid-cols-12 gap-2">
        {MONTH_LABELS.map((label, idx) => {
          const monthNum = idx + 1;
          const data = monthMap.get(monthNum);
          const isSelected = monthNum === selectedMonth;
          const cashFlow = data?.projectedCashFlow ?? 0;
          const isPositive = cashFlow > 0;
          const isNegative = cashFlow < 0;
          const hasData = data?.hasData ?? false;

          // Calculate delta vs prior month
          const prevData = monthMap.get(monthNum - 1);
          const delta =
            prevData && hasData
              ? cashFlow - prevData.projectedCashFlow
              : null;

          return (
            <button
              key={monthNum}
              onClick={() => selectMonth(monthNum)}
              className={`flex flex-col gap-1 rounded-lg border p-2 text-left transition-all hover:shadow-[0_0_24px_0px_#93065b33] ${
                isSelected
                  ? "border-midnight-violet-500 bg-slate-grey-900"
                  : "border-dusty-lavender-800 bg-slate-grey-900 hover:border-dusty-lavender-600"
              }`}
            >
              <span className="text-xs font-medium text-dusty-lavender-400">
                {label}
              </span>
              {hasData ? (
                <>
                  <span
                    className={`text-xs font-semibold ${
                      isPositive
                        ? "text-success"
                        : isNegative
                          ? "text-danger"
                          : "text-dusty-lavender-400"
                    }`}
                  >
                    {isPositive ? "+" : ""}${cashFlow.toFixed(0)}
                  </span>
                  {delta !== null && (
                    <span
                      className={`text-[10px] ${
                        delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-dusty-lavender-400"
                      }`}
                    >
                      {delta > 0 ? "+" : ""}${delta.toFixed(0)} vs prev
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs text-dusty-lavender-400 opacity-40">—</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/tracker/_components/year-overview.tsx
git commit -m "feat: add YearOverview strip component"
```

---

## Task 7: Month header stats

**Files:**
- Create: `src/app/(app)/tracker/_components/month-header-stats.tsx`

- [ ] **Step 1: Create MonthHeaderStats**

Create `src/app/(app)/tracker/_components/month-header-stats.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

type LineItem = {
  type: string;
  amount: number;
  isChecked: boolean;
  isHypothetical: boolean;
};

type MonthHeaderStatsProps = {
  startingBalance: number;
  items: LineItem[];
  hypotheticalActive: boolean;
};

export function MonthHeaderStats({
  startingBalance,
  items,
  hypotheticalActive,
}: MonthHeaderStatsProps) {
  const visibleItems = items.filter(
    (i) => !i.isHypothetical || hypotheticalActive,
  );

  const checkedIncome = visibleItems
    .filter((i) => i.type === "income" && i.isChecked)
    .reduce((sum, i) => sum + i.amount, 0);

  const checkedExpenses = visibleItems
    .filter((i) => i.type === "expense" && i.isChecked)
    .reduce((sum, i) => sum + i.amount, 0);

  const actualCashFlow = checkedIncome - checkedExpenses;

  const totalIncome = visibleItems
    .filter((i) => i.type === "income")
    .reduce((sum, i) => sum + i.amount, 0);

  const totalExpenses = visibleItems
    .filter((i) => i.type === "expense")
    .reduce((sum, i) => sum + i.amount, 0);

  const projectedEndBalance = startingBalance + totalIncome - totalExpenses;

  function fmt(n: number) {
    const sign = n < 0 ? "-" : n > 0 ? "+" : "";
    return `${sign}$${Math.abs(n).toFixed(2)}`;
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="border-dusty-lavender-800 bg-slate-grey-900 transition-shadow hover:shadow-[0_0_24px_0px_#93065b33]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-dusty-lavender-400">
            Net Cash Flow (Actual)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <span
            className={`text-3xl font-semibold ${
              actualCashFlow > 0
                ? "text-success"
                : actualCashFlow < 0
                  ? "text-danger"
                  : "text-slate-grey-50"
            }`}
          >
            {fmt(actualCashFlow)}
          </span>
          <p className="mt-1 text-xs text-dusty-lavender-400">
            Checked items only
          </p>
        </CardContent>
      </Card>

      <Card className="border-dusty-lavender-800 bg-slate-grey-900 transition-shadow hover:shadow-[0_0_24px_0px_#93065b33]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-dusty-lavender-400">
            Projected End Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <span
            className={`text-3xl font-semibold ${
              projectedEndBalance > 0
                ? "text-slate-grey-50"
                : "text-danger"
            }`}
          >
            ${projectedEndBalance.toFixed(2)}
          </span>
          <p className="mt-1 text-xs text-dusty-lavender-400">
            Starting ${startingBalance.toFixed(2)} · all items
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/tracker/_components/month-header-stats.tsx
git commit -m "feat: add MonthHeaderStats component"
```

---

## Task 8: Line item row

**Files:**
- Create: `src/app/(app)/tracker/_components/line-item-row.tsx`

- [ ] **Step 1: Create LineItemRow**

Create `src/app/(app)/tracker/_components/line-item-row.tsx`:

```tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

type LineItem = {
  id: string;
  monthEntryId: string;
  name: string;
  type: string;
  amount: number;
  category: string;
  isChecked: boolean;
  isHypothetical: boolean;
};

type LineItemRowProps = {
  item: LineItem;
  onInvalidate: () => void;
};

export function LineItemRow({ item, onInvalidate }: LineItemRowProps) {
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountDraft, setAmountDraft] = useState(String(item.amount));

  const upsert = api.tracker.upsertLineItem.useMutation({
    onSuccess: onInvalidate,
  });

  const remove = api.tracker.deleteLineItem.useMutation({
    onSuccess: onInvalidate,
  });

  function toggleChecked() {
    upsert.mutate({ ...item, isChecked: !item.isChecked });
  }

  function toggleHypothetical() {
    upsert.mutate({ ...item, isHypothetical: !item.isHypothetical });
  }

  function submitAmountEdit() {
    const parsed = parseFloat(amountDraft);
    if (!isNaN(parsed) && parsed >= 0) {
      upsert.mutate({ ...item, amount: parsed });
    }
    setEditingAmount(false);
  }

  return (
    <div
      className={`flex items-center justify-between py-2.5 transition-opacity ${
        item.isChecked ? "opacity-40" : ""
      } ${item.isHypothetical && !item.isChecked ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={item.isChecked}
          onChange={toggleChecked}
          className="h-4 w-4 cursor-pointer accent-midnight-violet-500"
        />
        <span
          className={`text-sm font-medium ${
            item.isChecked
              ? "line-through text-dusty-lavender-400"
              : "text-slate-grey-50"
          }`}
        >
          {item.name}
        </span>
        {item.category && (
          <span className="rounded-full bg-mauve-shadow-500/20 px-2 py-0.5 text-xs text-mauve-shadow-500">
            {item.category}
          </span>
        )}
        {item.isHypothetical && (
          <span className="rounded-full bg-dusty-lavender-800/50 px-2 py-0.5 text-xs text-dusty-lavender-400">
            what-if
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {editingAmount ? (
          <input
            autoFocus
            className="w-24 rounded bg-slate-grey-950 px-2 py-1 text-right text-sm text-slate-grey-50 outline-none"
            type="number"
            min="0"
            step="0.01"
            value={amountDraft}
            onChange={(e) => setAmountDraft(e.target.value)}
            onBlur={submitAmountEdit}
            onKeyDown={(e) => e.key === "Enter" && submitAmountEdit()}
          />
        ) : (
          <button
            onClick={() => {
              setAmountDraft(String(item.amount));
              setEditingAmount(true);
            }}
            className={`text-sm font-semibold hover:underline ${
              item.type === "income" ? "text-success" : "text-slate-grey-50"
            }`}
          >
            {item.type === "income" ? "+" : "-"}${item.amount.toFixed(2)}
          </button>
        )}

        {/* Hypothetical toggle */}
        <button
          onClick={toggleHypothetical}
          title={item.isHypothetical ? "Mark as real" : "Mark as what-if"}
          className={`text-xs transition-colors ${
            item.isHypothetical
              ? "text-midnight-violet-500 hover:text-midnight-violet-400"
              : "text-dusty-lavender-400 hover:text-dusty-lavender-200"
          }`}
        >
          ⚗
        </button>

        <button
          onClick={() => remove.mutate({ id: item.id })}
          className="text-xs text-danger opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/tracker/_components/line-item-row.tsx
git commit -m "feat: add LineItemRow component with inline edit and what-if toggle"
```

---

## Task 9: Account balances + category breakdown panels

**Files:**
- Create: `src/app/(app)/tracker/_components/account-balances-panel.tsx`
- Create: `src/app/(app)/tracker/_components/category-breakdown-panel.tsx`

- [ ] **Step 1: Create AccountBalancesPanel**

Create `src/app/(app)/tracker/_components/account-balances-panel.tsx`:

```tsx
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export function AccountBalancesPanel() {
  const { data } = api.config.getAll.useQuery();
  const accounts = data?.accounts ?? [];
  const debts = data?.debts ?? [];

  const totalAssets = accounts
    .filter((a) => !a.isDebt)
    .reduce((sum, a) => sum + a.balance, 0);

  const totalDebtAccounts = accounts
    .filter((a) => a.isDebt)
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);

  const totalDebtRecords = debts.reduce((sum, d) => sum + d.totalOwed, 0);
  const netWorth = totalAssets - totalDebtAccounts - totalDebtRecords;

  return (
    <Card className="border-dusty-lavender-800 bg-slate-grey-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-grey-50">
          Account Balances
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {accounts.length === 0 && (
          <p className="text-xs text-dusty-lavender-400">
            No accounts — add them in Config
          </p>
        )}
        {accounts.map((a) => (
          <div key={a.id} className="flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-grey-50">{a.name}</span>
              {a.isDebt && (
                <span className="rounded-full bg-danger/20 px-1.5 py-0.5 text-[10px] text-danger">
                  debt
                </span>
              )}
            </div>
            <span className={a.isDebt ? "text-danger" : "text-slate-grey-50"}>
              {a.isDebt ? "-" : ""}${Math.abs(a.balance).toFixed(2)}
            </span>
          </div>
        ))}

        {debts.length > 0 && (
          <>
            <div className="my-1 h-px bg-dusty-lavender-800" />
            {debts.map((d) => (
              <div key={d.id} className="flex justify-between text-sm">
                <span className="text-dusty-lavender-400">{d.name}</span>
                <span className="text-danger">-${d.totalOwed.toFixed(2)}</span>
              </div>
            ))}
          </>
        )}

        <div className="mt-2 flex justify-between border-t border-dusty-lavender-800 pt-2 text-sm font-semibold">
          <span className="text-dusty-lavender-400">Net Worth</span>
          <span className={netWorth >= 0 ? "text-success" : "text-danger"}>
            {netWorth < 0 ? "-" : ""}${Math.abs(netWorth).toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create CategoryBreakdownPanel**

Create `src/app/(app)/tracker/_components/category-breakdown-panel.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

type LineItem = {
  type: string;
  amount: number;
  category: string;
  isHypothetical: boolean;
};

type CategoryBreakdownPanelProps = {
  items: LineItem[];
  hypotheticalActive: boolean;
};

export function CategoryBreakdownPanel({
  items,
  hypotheticalActive,
}: CategoryBreakdownPanelProps) {
  const expenses = items.filter(
    (i) =>
      i.type === "expense" && (!i.isHypothetical || hypotheticalActive),
  );

  const byCategory = expenses.reduce<Record<string, number>>((acc, item) => {
    const cat = item.category || "Uncategorized";
    acc[cat] = (acc[cat] ?? 0) + item.amount;
    return acc;
  }, {});

  const sorted = Object.entries(byCategory).sort(([, a], [, b]) => b - a);
  const total = sorted.reduce((sum, [, v]) => sum + v, 0);

  return (
    <Card className="border-dusty-lavender-800 bg-slate-grey-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-grey-50">
          Spending by Category
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {sorted.length === 0 && (
          <p className="text-xs text-dusty-lavender-400">No expenses yet</p>
        )}
        {sorted.map(([cat, amount]) => {
          const pct = total > 0 ? (amount / total) * 100 : 0;
          return (
            <div key={cat} className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-grey-50">{cat}</span>
                <span className="text-dusty-lavender-400">
                  ${amount.toFixed(2)}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-dusty-lavender-800">
                <div
                  className="h-full rounded-full bg-midnight-violet-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/tracker/_components/account-balances-panel.tsx src/app/\(app\)/tracker/_components/category-breakdown-panel.tsx
git commit -m "feat: add AccountBalancesPanel and CategoryBreakdownPanel"
```

---

## Task 10: Month detail component

**Files:**
- Create: `src/app/(app)/tracker/_components/month-detail.tsx`

- [ ] **Step 1: Create MonthDetail**

Create `src/app/(app)/tracker/_components/month-detail.tsx`:

```tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { MonthHeaderStats } from "./month-header-stats";
import { LineItemRow } from "./line-item-row";
import { AccountBalancesPanel } from "./account-balances-panel";
import { CategoryBreakdownPanel } from "./category-breakdown-panel";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type MonthDetailProps = {
  year: number;
  month: number;
};

export function MonthDetail({ year, month }: MonthDetailProps) {
  const utils = api.useUtils();
  const [hypotheticalActive, setHypotheticalActive] = useState(false);
  const [newIncomeName, setNewIncomeName] = useState("");
  const [newIncomeAmount, setNewIncomeAmount] = useState("");
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");

  const { data, isLoading } = api.tracker.getMonth.useQuery({ year, month });

  const updateEntry = api.tracker.updateMonthEntry.useMutation({
    onSuccess: () => utils.tracker.getMonth.invalidate({ year, month }),
  });

  const upsertItem = api.tracker.upsertLineItem.useMutation({
    onSuccess: () => utils.tracker.getMonth.invalidate({ year, month }),
  });

  const copyLast = api.tracker.copyLastMonth.useMutation({
    onSuccess: () => utils.tracker.getMonth.invalidate({ year, month }),
  });

  function invalidate() {
    void utils.tracker.getMonth.invalidate({ year, month });
    void utils.tracker.getYear.invalidate({ year });
  }

  if (isLoading || !data) {
    return (
      <div className="text-sm text-dusty-lavender-400">Loading month…</div>
    );
  }

  const { entry, items } = data;
  const incomeItems = items.filter((i) => i.type === "income");
  const expenseItems = items.filter((i) => i.type === "expense");
  const isEmpty = items.length === 0;

  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;

  function addIncome(e: React.FormEvent) {
    e.preventDefault();
    if (!newIncomeName) return;
    upsertItem.mutate({
      monthEntryId: entry.id,
      name: newIncomeName,
      type: "income",
      amount: parseFloat(newIncomeAmount) || 0,
      category: "",
      isChecked: false,
      isHypothetical: false,
    });
    setNewIncomeName("");
    setNewIncomeAmount("");
  }

  function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!newExpenseName) return;
    upsertItem.mutate({
      monthEntryId: entry.id,
      name: newExpenseName,
      type: "expense",
      amount: parseFloat(newExpenseAmount) || 0,
      category: "",
      isChecked: false,
      isHypothetical: false,
    });
    setNewExpenseName("");
    setNewExpenseAmount("");
  }

  const hasHypotheticals = items.some((i) => i.isHypothetical);

  return (
    <div className="flex flex-col gap-6">
      {/* Month title + controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-grey-50">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <div className="flex items-center gap-3">
          {hasHypotheticals && (
            <button
              onClick={() => setHypotheticalActive((v) => !v)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                hypotheticalActive
                  ? "border-midnight-violet-500 bg-midnight-violet-500/20 text-midnight-violet-500"
                  : "border-dusty-lavender-800 text-dusty-lavender-400 hover:text-slate-grey-50"
              }`}
            >
              ⚗ What-If {hypotheticalActive ? "ON" : "OFF"}
            </button>
          )}
          {isEmpty && (
            <Button
              size="sm"
              variant="outline"
              className="border-dusty-lavender-800 text-dusty-lavender-400 hover:text-slate-grey-50"
              onClick={() =>
                copyLast.mutate({ year: prevYear, month: prevMonth })
              }
              disabled={copyLast.isPending}
            >
              Copy from {MONTH_NAMES[prevMonth - 1]}
            </Button>
          )}
        </div>
      </div>

      {/* Starting balance */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-dusty-lavender-400">Starting Balance</span>
        <input
          className="w-32 rounded bg-slate-grey-900 px-2 py-1 text-sm text-slate-grey-50 outline-none ring-1 ring-dusty-lavender-800 focus:ring-midnight-violet-500"
          type="number"
          step="0.01"
          defaultValue={entry.startingBalance}
          onBlur={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val !== entry.startingBalance) {
              updateEntry.mutate({ year, month, startingBalance: val });
            }
          }}
        />
        <button
          className="text-xs text-dusty-lavender-400 hover:text-slate-grey-50"
          title={`Carry over from ${MONTH_NAMES[prevMonth - 1]}`}
          onClick={async () => {
            const prev = await utils.tracker.getMonth.fetch({
              year: prevYear,
              month: prevMonth,
            });
            if (prev) {
              const prevItems = prev.items.filter((i) => !i.isHypothetical);
              const totalIncome = prevItems
                .filter((i) => i.type === "income")
                .reduce((s, i) => s + i.amount, 0);
              const totalExpenses = prevItems
                .filter((i) => i.type === "expense")
                .reduce((s, i) => s + i.amount, 0);
              const projected =
                prev.entry.startingBalance + totalIncome - totalExpenses;
              updateEntry.mutate({ year, month, startingBalance: projected });
            }
          }}
        >
          ↑ Carry over
        </button>
      </div>

      {/* Header stats */}
      <MonthHeaderStats
        startingBalance={entry.startingBalance}
        items={items}
        hypotheticalActive={hypotheticalActive}
      />

      {/* Income / Expense columns */}
      <div className="flex gap-6">
        {/* Income */}
        <Card className="flex-1 border-dusty-lavender-800 bg-slate-grey-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-success">
              Income
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-dusty-lavender-800 px-4 pb-4">
            <div className="group">
              {incomeItems.map((item) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  onInvalidate={invalidate}
                />
              ))}
            </div>
            <form onSubmit={addIncome} className="flex gap-2 pt-3">
              <input
                className="flex-1 rounded bg-slate-grey-950 px-2 py-1 text-sm text-slate-grey-50 outline-none placeholder:text-dusty-lavender-400"
                placeholder="+ Add income"
                value={newIncomeName}
                onChange={(e) => setNewIncomeName(e.target.value)}
              />
              <input
                className="w-20 rounded bg-slate-grey-950 px-2 py-1 text-sm text-slate-grey-50 outline-none"
                placeholder="$0"
                type="number"
                min="0"
                step="0.01"
                value={newIncomeAmount}
                onChange={(e) => setNewIncomeAmount(e.target.value)}
              />
              <Button size="sm" type="submit" variant="ghost">
                Add
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="flex-1 border-dusty-lavender-800 bg-slate-grey-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-danger">
              Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-dusty-lavender-800 px-4 pb-4">
            <div className="group">
              {expenseItems.map((item) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  onInvalidate={invalidate}
                />
              ))}
            </div>
            <form onSubmit={addExpense} className="flex gap-2 pt-3">
              <input
                className="flex-1 rounded bg-slate-grey-950 px-2 py-1 text-sm text-slate-grey-50 outline-none placeholder:text-dusty-lavender-400"
                placeholder="+ Add expense"
                value={newExpenseName}
                onChange={(e) => setNewExpenseName(e.target.value)}
              />
              <input
                className="w-20 rounded bg-slate-grey-950 px-2 py-1 text-sm text-slate-grey-50 outline-none"
                placeholder="$0"
                type="number"
                min="0"
                step="0.01"
                value={newExpenseAmount}
                onChange={(e) => setNewExpenseAmount(e.target.value)}
              />
              <Button size="sm" type="submit" variant="ghost">
                Add
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Panels row */}
      <div className="flex gap-6">
        <div className="flex-1">
          <CategoryBreakdownPanel
            items={items}
            hypotheticalActive={hypotheticalActive}
          />
        </div>
        <div className="flex-1">
          <AccountBalancesPanel />
        </div>
      </div>

      {/* Notes */}
      <Card className="border-dusty-lavender-800 bg-slate-grey-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-dusty-lavender-400">
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full resize-none rounded bg-slate-grey-950 px-3 py-2 text-sm text-slate-grey-50 outline-none placeholder:text-dusty-lavender-400 focus:ring-1 focus:ring-midnight-violet-500"
            rows={3}
            placeholder="Add a note for this month…"
            defaultValue={entry.notes}
            onBlur={(e) => {
              if (e.target.value !== entry.notes) {
                updateEntry.mutate({ year, month, notes: e.target.value });
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/tracker/_components/month-detail.tsx
git commit -m "feat: add MonthDetail component with income/expense checklists and what-if toggle"
```

---

## Task 11: Tracker main page

**Files:**
- Create: `src/app/(app)/tracker/page.tsx`
- Create: `src/app/(app)/tracker/_components/tracker-content.tsx`

- [ ] **Step 1: Create TrackerContent client component**

Create `src/app/(app)/tracker/_components/tracker-content.tsx`:

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { YearOverview } from "./year-overview";
import { MonthDetail } from "./month-detail";

export function TrackerContent() {
  const searchParams = useSearchParams();
  const now = new Date();

  const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10);

  const { data: yearData } = api.tracker.getYear.useQuery({ year });

  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const found = yearData?.find((m) => m.month === i + 1);
    return {
      month: i + 1,
      projectedCashFlow: found?.projectedCashFlow ?? 0,
      actualCashFlow: found?.actualCashFlow ?? 0,
      hasData: !!found,
    };
  });

  return (
    <div className="flex flex-col gap-8">
      <YearOverview year={year} selectedMonth={month} months={allMonths} />
      <MonthDetail year={year} month={month} />
    </div>
  );
}
```

- [ ] **Step 2: Create the server page**

Create `src/app/(app)/tracker/page.tsx`:

```tsx
import { Suspense } from "react";
import { HydrateClient, api } from "~/trpc/server";
import { TrackerContent } from "./_components/tracker-content";

export default async function TrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = parseInt(params.year ?? String(now.getFullYear()), 10);
  const month = parseInt(params.month ?? String(now.getMonth() + 1), 10);

  void api.tracker.getYear.prefetch({ year });
  void api.tracker.getMonth.prefetch({ year, month });
  void api.config.getAll.prefetch();

  return (
    <HydrateClient>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-grey-50">
            Finance Tracker
          </h1>
          <a
            href="/tracker/config"
            className="text-sm text-dusty-lavender-400 hover:text-slate-grey-50"
          >
            Configure →
          </a>
        </div>
        <Suspense
          fallback={
            <div className="text-sm text-dusty-lavender-400">Loading…</div>
          }
        >
          <TrackerContent />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
bun typecheck
```

Fix any type errors before continuing. Common issues:
- `searchParams` in Next.js 15 is a `Promise` — already handled above with `await searchParams`
- The `AccountBalancesPanel` uses `api` from `~/trpc/react` but is imported into `MonthDetail` which is already a client component — this is fine

- [ ] **Step 4: Full browser verification**

Run `bun dev`. Go through this checklist:

1. Click "Tracker" in sidebar → `/tracker` loads
2. Year strip shows 12 months; current month is highlighted
3. Click a different month → detail below updates, URL changes
4. Click ← / → year arrows → year changes
5. Go to `/tracker/config` → add a recurring template (e.g. "Rent", expense, $1200)
6. Return to `/tracker` → the template appears as a line item in the current month
7. Check off an expense → Net Cash Flow (Actual) updates
8. Click ⚗ on a line item → it turns into a "what-if" item, dims
9. Toggle "What-If ON" → header numbers update to include it
10. Edit an amount inline → new value persists on refresh
11. Edit starting balance → Projected End Balance updates
12. Click "Carry over" → fills starting balance from prior month's projection
13. Add one-off income and expense via the "Add" forms
14. Notes field: type something, click outside → persists on refresh
15. Navigate to a future empty month → "Copy from [prev month]" button appears
16. Click it → prior month's items appear (unchecked)
17. Config page: add account, add debt → net worth shows in Account Balances panel

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/tracker/
git commit -m "feat: complete finance tracker with year overview, month detail, and what-if toggles"
```

---

## Self-Review Notes

- `AccountBalancesPanel` and `CategoryBreakdownPanel` are imported in `MonthDetail` (client component) — they use `"use client"` data too, which is fine since the parent is already a client component
- The `copyLastMonth` mutation silently no-ops if the target month isn't empty — this matches spec behavior
- `tracker.getMonth` auto-creates the month entry and populates from templates — this is a query with a side effect. If this causes issues with React Query's cache in strict mode, refactor to a mutation + separate query pattern
- The `LineItemRow` delete button uses `opacity-0 group-hover:opacity-100` — ensure the parent div has `group` class added (it currently uses `group` on the wrapping div in MonthDetail)
- The `financialAccount` table name avoids collision with Better Auth's `account` table ✓
