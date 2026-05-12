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

  const upsert = api.tracker.upsertLineItem.useMutation({ onSuccess: onInvalidate });
  const remove = api.tracker.deleteLineItem.useMutation({ onSuccess: onInvalidate });

  function toggleChecked() {
    upsert.mutate({
      id: item.id,
      monthEntryId: item.monthEntryId,
      name: item.name,
      type: item.type as "expense" | "income",
      amount: item.amount,
      category: item.category,
      isChecked: !item.isChecked,
      isHypothetical: item.isHypothetical,
    });
  }

  function toggleHypothetical() {
    upsert.mutate({
      id: item.id,
      monthEntryId: item.monthEntryId,
      name: item.name,
      type: item.type as "expense" | "income",
      amount: item.amount,
      category: item.category,
      isChecked: item.isChecked,
      isHypothetical: !item.isHypothetical,
    });
  }

  function submitAmountEdit() {
    const parsed = parseFloat(amountDraft);
    if (!isNaN(parsed) && parsed >= 0) {
      upsert.mutate({
        id: item.id,
        monthEntryId: item.monthEntryId,
        name: item.name,
        type: item.type as "expense" | "income",
        amount: parsed,
        category: item.category,
        isChecked: item.isChecked,
        isHypothetical: item.isHypothetical,
      });
    }
    setEditingAmount(false);
  }

  return (
    <div className={`group flex items-center justify-between py-2.5 transition-opacity ${item.isChecked ? "opacity-40" : ""} ${item.isHypothetical && !item.isChecked ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={item.isChecked}
          onChange={toggleChecked}
          className="h-4 w-4 cursor-pointer accent-midnight-violet-500"
        />
        <span className={`text-sm font-medium ${item.isChecked ? "line-through text-dusty-lavender-400" : "text-slate-grey-50"}`}>
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
            onClick={() => { setAmountDraft(String(item.amount)); setEditingAmount(true); }}
            className={`text-sm font-semibold hover:underline ${item.type === "income" ? "text-success" : "text-slate-grey-50"}`}
          >
            {item.type === "income" ? "+" : "-"}${item.amount.toFixed(2)}
          </button>
        )}

        <button
          onClick={toggleHypothetical}
          title={item.isHypothetical ? "Mark as real" : "Mark as what-if"}
          className={`text-xs transition-colors ${item.isHypothetical ? "text-midnight-violet-500 hover:text-midnight-violet-400" : "text-dusty-lavender-400 hover:text-dusty-lavender-200"}`}
        >
          ⚗
        </button>

        <button
          onClick={() => remove.mutate({ id: item.id })}
          className="text-xs text-danger opacity-0 transition-opacity group-hover:opacity-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
