import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { getSession } from "~/server/better-auth/server";

const PLACEHOLDER_TRANSACTIONS = [
  { date: "May 10", merchant: "Whole Foods", category: "Groceries", amount: "-$84.32", income: false },
  { date: "May 9", merchant: "Netflix", category: "Subscriptions", amount: "-$15.99", income: false },
  { date: "May 8", merchant: "Shell Gas", category: "Transport", amount: "-$62.00", income: false },
  { date: "May 7", merchant: "Employer Inc.", category: "Income", amount: "+$3,200.00", income: true },
  { date: "May 6", merchant: "Amazon", category: "Shopping", amount: "-$43.17", income: false },
];

const PLACEHOLDER_BUDGETS = [
  { category: "Groceries", spent: 240, limit: 400 },
  { category: "Dining", spent: 185, limit: 200 },
  { category: "Transport", spent: 90, limit: 150 },
  { category: "Shopping", spent: 320, limit: 300 },
];

const STAT_CARDS = [
  {
    label: "Net Worth",
    value: "$0.00",
    secondary: "No accounts connected yet",
  },
  {
    label: "Monthly Spending",
    value: "$0.00",
    secondary: "of $2,000 budget · 0%",
    hasProgress: true,
    progress: 0,
  },
  {
    label: "Budget Status",
    value: "—",
    secondary: "No budgets set up yet",
  },
  {
    label: "Savings Rate",
    value: "0%",
    secondary: "vs. last month: —",
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getFirstName(fullName: string): string {
  return fullName.split(" ")[0] ?? fullName;
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default async function DashboardPage() {
  const session = await getSession();
  const firstName = getFirstName(session?.user.name ?? "there");

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-grey-50">
          {getGreeting()}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-dusty-lavender-400">{formatDate()}</p>
      </div>

      {/* Stat Cards — 2×2 grid */}
      <div className="grid grid-cols-2 gap-4">
        {STAT_CARDS.map((card) => (
          <Card
            key={card.label}
            className="border-dusty-lavender-800 bg-slate-grey-900 transition-shadow hover:shadow-[0_0_24px_0px_#93065b33]"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-dusty-lavender-400">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <span className="text-3xl font-semibold text-slate-grey-50">
                {card.value}
              </span>
              {card.hasProgress ? (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-dusty-lavender-400">
                    {card.secondary}
                  </span>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-dusty-lavender-800">
                    <div
                      className="h-full rounded-full bg-midnight-violet-500"
                      style={{ width: `${card.progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <span className="text-sm text-dusty-lavender-400">
                  {card.secondary}
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-column section */}
      <div className="flex gap-6">
        {/* Recent Transactions — 60% */}
        <Card className="flex-[3] border-dusty-lavender-800 bg-slate-grey-900">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-grey-50">
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex flex-col divide-y divide-dusty-lavender-800">
              {PLACEHOLDER_TRANSACTIONS.map((tx) => (
                <div
                  key={`${tx.date}-${tx.merchant}`}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-12 shrink-0 text-xs text-dusty-lavender-400">
                      {tx.date}
                    </span>
                    <span className="text-sm font-medium text-slate-grey-50">
                      {tx.merchant}
                    </span>
                    <span className="rounded-full bg-mauve-shadow-500/20 px-2 py-0.5 text-xs font-medium text-mauve-shadow-500">
                      {tx.category}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      tx.income ? "text-green-400" : "text-slate-grey-50"
                    }`}
                  >
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Budget Progress — 40% */}
        <Card className="flex-[2] border-dusty-lavender-800 bg-slate-grey-900">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-grey-50">
              Budget Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 px-6 pb-6">
            {PLACEHOLDER_BUDGETS.map((b) => {
              const pct = Math.min((b.spent / b.limit) * 100, 100);
              const overBudget = b.spent > b.limit;
              return (
                <div key={b.category} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-grey-50">
                      {b.category}
                    </span>
                    <span
                      className={`text-xs ${overBudget ? "text-red-400" : "text-dusty-lavender-400"}`}
                    >
                      ${b.spent} / ${b.limit}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-dusty-lavender-800">
                    <div
                      className={`h-full rounded-full transition-all ${overBudget ? "bg-red-500" : "bg-midnight-violet-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
