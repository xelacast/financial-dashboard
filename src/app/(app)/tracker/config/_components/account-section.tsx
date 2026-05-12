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
    setForm({ name: a.name, type: a.type, balance: String(a.balance), isDebt: a.isDebt });
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
                <option key={t.value} value={t.value}>{t.label}</option>
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
              <span className="text-sm font-medium text-slate-grey-50">{a.name}</span>
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
              <span className={`text-sm ${a.isDebt ? "text-danger" : "text-slate-grey-50"}`}>
                {a.isDebt ? "-" : ""}${Math.abs(a.balance).toFixed(2)}
              </span>
              <button onClick={() => startEdit(a)} className="text-xs text-dusty-lavender-400 hover:text-slate-grey-50">Edit</button>
              <button onClick={() => remove.mutate({ id: a.id })} className="text-xs text-danger hover:opacity-80">Delete</button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
