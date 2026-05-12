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

export function DebtSection({ debts, accounts }: { debts: Debt[]; accounts: FinancialAccount[] }) {
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
    setForm({ name: d.name, totalOwed: String(d.totalOwed), monthlyPayment: String(d.monthlyPayment), accountId: d.accountId ?? "" });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
        <CardTitle className="text-base font-semibold text-slate-grey-50">Debts</CardTitle>
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
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
            <Button size="sm" type="submit" disabled={upsert.isPending}>
              {editingId ? "Save" : "Add"}
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
          </form>
        )}

        {debts.length === 0 && !showForm && (
          <p className="text-sm text-dusty-lavender-400">No debts tracked yet.</p>
        )}

        {debts.map((d) => {
          const linkedAccount = accounts.find((a) => a.id === d.accountId);
          return (
            <div key={d.id} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-slate-grey-950">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-grey-50">{d.name}</span>
                {linkedAccount && (
                  <span className="rounded-full bg-mauve-shadow-500/20 px-2 py-0.5 text-xs text-mauve-shadow-500">{linkedAccount.name}</span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-danger">Owed: ${d.totalOwed.toFixed(2)}</span>
                <span className="text-xs text-dusty-lavender-400">${d.monthlyPayment.toFixed(2)}/mo</span>
                <button onClick={() => startEdit(d)} className="text-xs text-dusty-lavender-400 hover:text-slate-grey-50">Edit</button>
                <button onClick={() => remove.mutate({ id: d.id })} className="text-xs text-danger hover:opacity-80">Delete</button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
