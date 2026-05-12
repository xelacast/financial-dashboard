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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
