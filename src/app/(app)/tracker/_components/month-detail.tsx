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
    onSuccess: () => {
      void utils.tracker.getMonth.invalidate({ year, month });
      void utils.tracker.getYear.invalidate({ year });
    },
  });

  const upsertItem = api.tracker.upsertLineItem.useMutation({
    onSuccess: () => {
      void utils.tracker.getMonth.invalidate({ year, month });
      void utils.tracker.getYear.invalidate({ year });
    },
  });

  const copyLast = api.tracker.copyLastMonth.useMutation({
    onSuccess: () => {
      void utils.tracker.getMonth.invalidate({ year, month });
      void utils.tracker.getYear.invalidate({ year });
    },
  });

  if (isLoading || !data) {
    return <div className="text-sm text-dusty-lavender-400">Loading month…</div>;
  }

  const { entry, items } = data;
  const incomeItems = items.filter((i) => i.type === "income");
  const expenseItems = items.filter((i) => i.type === "expense");
  const isEmpty = items.length === 0;

  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;

  function addIncome(e: React.FormEvent<HTMLFormElement>) {
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

  function addExpense(e: React.FormEvent<HTMLFormElement>) {
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
              onClick={() => copyLast.mutate({ year, month })}
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
              const projected = prev.entry.startingBalance + totalIncome - totalExpenses;
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
            <CardTitle className="text-sm font-semibold text-success">Income</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-dusty-lavender-800 px-4 pb-4">
            <div>
              {incomeItems.map((item) => (
                <LineItemRow key={item.id} item={item} year={year} month={month} />
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
              <Button size="sm" type="submit" variant="ghost">Add</Button>
            </form>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="flex-1 border-dusty-lavender-800 bg-slate-grey-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-danger">Expenses</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-dusty-lavender-800 px-4 pb-4">
            <div>
              {expenseItems.map((item) => (
                <LineItemRow key={item.id} item={item} year={year} month={month} />
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
              <Button size="sm" type="submit" variant="ghost">Add</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Panels row */}
      <div className="flex gap-6">
        <div className="flex-1">
          <CategoryBreakdownPanel items={items} hypotheticalActive={hypotheticalActive} />
        </div>
        <div className="flex-1">
          <AccountBalancesPanel />
        </div>
      </div>

      {/* Notes */}
      <Card className="border-dusty-lavender-800 bg-slate-grey-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-dusty-lavender-400">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full resize-none rounded bg-slate-grey-950 px-3 py-2 text-sm text-slate-grey-50 outline-none placeholder:text-dusty-lavender-400 focus:ring-1 focus:ring-midnight-violet-500"
            rows={3}
            placeholder="Add a note for this month…"
            defaultValue={entry.notes ?? ""}
            onBlur={(e) => {
              if (e.target.value !== (entry.notes ?? "")) {
                updateEntry.mutate({ year, month, notes: e.target.value });
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
