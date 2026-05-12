"use client";

import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export function AccountBalancesPanel() {
  const { data } = api.config.getAll.useQuery();
  const accounts = data?.accounts ?? [];
  const debts = data?.debts ?? [];

  const totalAssets = accounts.filter((a) => !a.isDebt).reduce((sum, a) => sum + a.balance, 0);
  const totalDebtAccounts = accounts.filter((a) => a.isDebt).reduce((sum, a) => sum + Math.abs(a.balance), 0);
  const totalDebtRecords = debts.reduce((sum, d) => sum + d.totalOwed, 0);
  const netWorth = totalAssets - totalDebtAccounts - totalDebtRecords;

  return (
    <Card className="border-dusty-lavender-800 bg-slate-grey-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-grey-50">Account Balances</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {accounts.length === 0 && (
          <p className="text-xs text-dusty-lavender-400">No accounts — add them in Config</p>
        )}
        {accounts.map((a) => (
          <div key={a.id} className="flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-grey-50">{a.name}</span>
              {a.isDebt && (
                <span className="rounded-full bg-danger/20 px-1.5 py-0.5 text-[10px] text-danger">debt</span>
              )}
            </div>
            <span className={a.isDebt ? "text-danger" : "text-slate-grey-50"}>
              {a.isDebt ? "-" : ""}${Math.abs(a.balance).toFixed(2)}
            </span>
          </div>
        ))}

        {debts.length > 0 && (
          <>
            <div className="my-1 h-px bg-dusty-lavender-800" />
            {debts.map((d) => (
              <div key={d.id} className="flex justify-between text-sm">
                <span className="text-dusty-lavender-400">{d.name}</span>
                <span className="text-danger">-${d.totalOwed.toFixed(2)}</span>
              </div>
            ))}
          </>
        )}

        <div className="mt-2 flex justify-between border-t border-dusty-lavender-800 pt-2 text-sm font-semibold">
          <span className="text-dusty-lavender-400">Net Worth</span>
          <span className={netWorth >= 0 ? "text-success" : "text-danger"}>
            {netWorth < 0 ? "-" : ""}${Math.abs(netWorth).toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
