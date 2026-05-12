"use client";

import { useRouter, useSearchParams } from "next/navigation";

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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
      <div className="flex items-center gap-3">
        <button onClick={() => changeYear(-1)} className="text-dusty-lavender-400 hover:text-slate-grey-50">←</button>
        <span className="text-sm font-semibold text-slate-grey-50">{year}</span>
        <button onClick={() => changeYear(1)} className="text-dusty-lavender-400 hover:text-slate-grey-50">→</button>
      </div>

      <div className="grid grid-cols-12 gap-2">
        {MONTH_LABELS.map((label, idx) => {
          const monthNum = idx + 1;
          const data = monthMap.get(monthNum);
          const isSelected = monthNum === selectedMonth;
          const cashFlow = data?.projectedCashFlow ?? 0;
          const isPositive = cashFlow > 0;
          const isNegative = cashFlow < 0;
          const hasData = data?.hasData ?? false;

          const prevData = monthMap.get(monthNum - 1);
          const delta = prevData && hasData ? cashFlow - prevData.projectedCashFlow : null;

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
              <span className="text-xs font-medium text-dusty-lavender-400">{label}</span>
              {hasData ? (
                <>
                  <span className={`text-xs font-semibold ${isPositive ? "text-success" : isNegative ? "text-danger" : "text-dusty-lavender-400"}`}>
                    {isPositive ? "+" : ""}${cashFlow.toFixed(0)}
                  </span>
                  {delta !== null && (
                    <span className={`text-[10px] ${delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-dusty-lavender-400"}`}>
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
