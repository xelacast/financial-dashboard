"use client";

import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { YearOverview } from "./year-overview";
import { MonthDetail } from "./month-detail";

export function TrackerContent() {
  const searchParams = useSearchParams();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");

  const year = yearParam ? parseInt(yearParam, 10) : currentYear;
  const month = monthParam ? parseInt(monthParam, 10) : currentMonth;

  const { data: yearData } = api.tracker.getYear.useQuery({ year });

  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    const entry = yearData?.find((e) => e.month === monthNum);
    return {
      month: monthNum,
      hasData: entry !== undefined,
      actualCashFlow: entry?.actualCashFlow ?? 0,
      projectedCashFlow: entry?.projectedCashFlow ?? 0,
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-col gap-8">
        <YearOverview year={year} selectedMonth={month} months={allMonths} />
        <MonthDetail year={year} month={month} />
      </div>
    </div>
  );
}
