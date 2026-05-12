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

export function CategoryBreakdownPanel({ items, hypotheticalActive }: CategoryBreakdownPanelProps) {
  const expenses = items.filter((i) => i.type === "expense" && (!i.isHypothetical || hypotheticalActive));

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
        <CardTitle className="text-sm font-semibold text-slate-grey-50">Spending by Category</CardTitle>
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
                <span className="text-dusty-lavender-400">${amount.toFixed(2)}</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-dusty-lavender-800">
                <div className="h-full rounded-full bg-midnight-violet-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
