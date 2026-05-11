# Finance Month-to-Month Tracker — Design Spec

**Date:** 2026-05-11  
**Status:** Approved

---

## Overview

A month-to-month personal finance simulation built into the existing dashboard. The user manually configures recurring income and expenses, logs starting account balances, checks off paid/received items as the month progresses, and can toggle hypothetical expenses to test long-term affordability. A year-overview strip provides at-a-glance comparison across all months.

---

## Routes

Two new routes inside the authenticated `(app)/` group:

- **`/tracker`** — main page. Contains both the year overview strip and the month detail view. URL tracks selected month via `?year=2026&month=05`. Defaults to current month on first load.
- **`/tracker/config`** — configuration page for recurring templates, accounts, and debts.

A "Tracker" link is added to the existing Sidebar nav.

---

## Data Model

All tables scoped to `userId`. Uses the existing Drizzle ORM + SQLite setup.

### `financialAccount`  
Tracks the user's financial accounts. Named `financialAccount` to avoid collision with the existing Better Auth `account` table.

| Column | Type | Notes |
|---|---|---|
| id | text PK | UUID |
| userId | text FK | references `user.id` |
| name | text | e.g. "Chase Checking" |
| type | text | `checking` \| `savings` \| `credit_card` \| `loan` |
| balance | real | current balance in dollars |
| isDebt | integer (bool) | if true, subtracts from net worth |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### `recurringTemplate`  
The user's configured default monthly items.

| Column | Type | Notes |
|---|---|---|
| id | text PK | UUID |
| userId | text FK | |
| name | text | e.g. "Rent", "Freelance Client A" |
| type | text | `expense` \| `income` |
| defaultAmount | real | |
| category | text | user-defined label |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### `monthEntry`  
One record per user per month. Created on first visit to a month.

| Column | Type | Notes |
|---|---|---|
| id | text PK | UUID |
| userId | text FK | |
| year | integer | e.g. 2026 |
| month | integer | 1–12 |
| startingBalance | real | manual starting money in bank |
| notes | text | free-text field |
| createdAt | timestamp | |
| updatedAt | timestamp | |

Unique constraint: `(userId, year, month)`

### `lineItem`  
Individual income or expense rows within a month.

| Column | Type | Notes |
|---|---|---|
| id | text PK | UUID |
| monthEntryId | text FK | references `monthEntry.id` |
| userId | text FK | for fast querying |
| name | text | |
| type | text | `expense` \| `income` |
| amount | real | can differ from template default |
| category | text | |
| isChecked | integer (bool) | paid / received |
| isHypothetical | integer (bool) | what-if toggle |
| templateId | text FK nullable | source template if auto-generated |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### `debt`  
Simple debt records separate from accounts.

| Column | Type | Notes |
|---|---|---|
| id | text PK | UUID |
| userId | text FK | |
| name | text | e.g. "Student Loan" |
| totalOwed | real | |
| monthlyPayment | real | |
| accountId | text FK nullable | optional link to a `financialAccount` |
| createdAt | timestamp | |
| updatedAt | timestamp | |

---

## tRPC Routers

All procedures use `protectedProcedure` (auth-gated).

**`tracker.getYear`** — returns all month entries + aggregated line item totals for a given year. Powers the year overview strip.

**`tracker.getMonth`** — returns a single month entry with all line items. Creates the month entry (and auto-populates from recurring templates) if it doesn't exist yet.

**`tracker.updateMonthEntry`** — update `startingBalance` or `notes` for a month.

**`tracker.upsertLineItem`** — create or update a line item (amount, isChecked, isHypothetical, name, category).

**`tracker.deleteLineItem`** — delete a one-off line item.

**`tracker.copyLastMonth`** — copies all line items from the previous month into the current month as a starting point (does not re-run template generation).

**`config.getAll`** — returns all recurring templates, accounts, and debts for the user.

**`config.upsertTemplate`** — create or update a recurring template.

**`config.deleteTemplate`** — delete a template (does not affect existing month line items).

**`config.upsertFinancialAccount`** — create or update a financial account.

**`config.deleteFinancialAccount`** — delete a financial account.

**`config.upsertDebt`** — create or update a debt record.

**`config.deleteDebt`** — delete a debt record.

---

## `/tracker` Page — Layout & Interactions

### Year Overview Strip (top)

- Year navigator: `← 2026 →`
- 12 month cards in a horizontal scrollable row
- Each card shows:
  - Month name (Jan, Feb, …)
  - Net cash flow — green if positive, red if negative, grey if no data
  - Delta vs. prior month (e.g. `+$320 vs Apr`)
  - Small dot/bar indicating actual vs. projected progress
  - Highlighted border on the selected month
- Clicking a card updates the month detail below and updates the URL param

### Month Detail (below strip)

**Header — two large stat cards:**
- *Net Cash Flow (Actual)*: sum of checked income − sum of checked expenses. Excludes hypothetical items unless toggled on.
- *Projected End Balance*: `startingBalance` + all income − all expenses (checked and unchecked). Hypothetical items excluded unless toggled on.
- Both numbers update live as items are checked/unchecked or hypotheticals are toggled.

**Starting Balance row** — editable inline field showing the starting money for the month. Option to "carry over from last month" which fills it from the previous month's projected end balance.

**Two-column layout — Income | Expenses:**
- Each row: checkbox · name · category tag · amount (editable inline) · hypothetical toggle icon · delete button
- Checked rows visually dim to indicate done
- Hypothetical rows are visually dimmed with a distinct style until the toggle is active
- "Add item" row at the bottom of each column for one-off additions
- When a hypothetical item's toggle is turned on, header numbers update immediately

**Category Breakdown panel** — below the two columns. Lists total spent/received per category for the month. Expense categories only. No charts — clean list format.

**Account Balances panel** — shows each account with balance. Debt accounts shown in red with a "debt" label. Net worth total at the bottom (all balances minus all debts).

**Notes field** — small free-text area at the bottom of the month detail for context.

**Copy Last Month button** — pulls all line items from the previous month into this month as a starting point. Only available if the month is empty or newly created.

---

## `/tracker/config` Page — Layout

Three sections on one page:

**Recurring Templates**
- List of all configured templates
- Each row: name · type badge (income/expense) · category · default amount · edit · delete
- "Add template" form inline or in a small modal

**Accounts**
- List of all accounts
- Each row: name · type · balance · debt badge if applicable · edit · delete
- "Add account" form

**Debts**
- List of debt records
- Each row: name · total owed · monthly payment · linked account (if any) · edit · delete
- "Add debt" form

---

## Month Auto-Population Logic

When a user visits a month for the first time (`tracker.getMonth` finds no existing `monthEntry`):
1. A new `monthEntry` is created with `startingBalance = 0` and empty notes.
2. All of the user's `recurringTemplate` records are copied into `lineItem` rows for that month, preserving name, type, amount, and category. `isChecked = false`, `isHypothetical = false`.
3. The `templateId` foreign key is set so the source is traceable, but edits to the line item do not affect the template.

---

## Additional Features

| Feature | Where |
|---|---|
| Month-over-month delta | Year overview strip card |
| Category spending breakdown | Month detail — below columns |
| Copy last month | Month detail — button, visible on empty months |
| Carry-over balance | Starting balance row — "carry over" action |
| Notes per month | Month detail — bottom free-text field |

---

## Design System

Follows existing conventions from CLAUDE.md:
- Page background: `bg-slate-grey-950`
- Card surface: `bg-slate-grey-900`, border: `border-dusty-lavender-800`
- Card hover glow: `hover:shadow-[0_0_24px_0px_#93065b33]`
- Positive values (income, surplus): `text-success`
- Negative values (over-budget, deficit): `text-danger`
- Primary accent: `text-midnight-violet-500`
- Muted text: `text-dusty-lavender-400`
- shadcn `Card`, `CardHeader`, `CardContent`, `CardTitle` for all card surfaces

---

## Out of Scope (for now)

- Bank account syncing / Plaid integration
- Charts and graphs
- Multi-currency support
- Recurring debt interest calculations
- Export to CSV/PDF
- Shared/household budgets
