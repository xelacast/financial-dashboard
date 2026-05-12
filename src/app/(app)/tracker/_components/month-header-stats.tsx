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

export function MonthHeaderStats({ startingBalance, items, hypotheticalActive }: MonthHeaderStatsProps) {
  const visibleItems = items.filter((i) => !i.isHypothetical || hypotheticalActive);

  const checkedIncome = visibleItems.filter((i) => i.type === "income" && i.isChecked).reduce((sum, i) => sum + i.amount, 0);
  const checkedExpenses = visibleItems.filter((i) => i.type === "expense" && i.isChecked).reduce((sum, i) => sum + i.amount, 0);
  const actualCashFlow = checkedIncome - checkedExpenses;

  const totalIncome = visibleItems.filter((i) => i.type === "income").reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = visibleItems.filter((i) => i.type === "expense").reduce((sum, i) => sum + i.amount, 0);
  const projectedEndBalance = startingBalance + totalIncome - totalExpenses;

  function fmt(n: number) {
    const sign = n < 0 ? "-" : n > 0 ? "+" : "";
    return `${sign}$${Math.abs(n).toFixed(2)}`;
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="border-dusty-lavender-800 bg-slate-grey-900 transition-shadow hover:shadow-[0_0_24px_0px_#93065b33]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-dusty-lavender-400">Net Cash Flow (Actual)</CardTitle>
        </CardHeader>
        <CardContent>
          <span className={`text-3xl font-semibold ${actualCashFlow > 0 ? "text-success" : actualCashFlow < 0 ? "text-danger" : "text-slate-grey-50"}`}>
            {fmt(actualCashFlow)}
          </span>
          <p className="mt-1 text-xs text-dusty-lavender-400">Checked items only</p>
        </CardContent>
      </Card>

      <Card className="border-dusty-lavender-800 bg-slate-grey-900 transition-shadow hover:shadow-[0_0_24px_0px_#93065b33]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-dusty-lavender-400">Projected End Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <span className={`text-3xl font-semibold ${projectedEndBalance >= 0 ? "text-slate-grey-50" : "text-danger"}`}>
            ${projectedEndBalance.toFixed(2)}
          </span>
          <p className="mt-1 text-xs text-dusty-lavender-400">Starting ${startingBalance.toFixed(2)} · all items</p>
        </CardContent>
      </Card>
    </div>
  );
}
