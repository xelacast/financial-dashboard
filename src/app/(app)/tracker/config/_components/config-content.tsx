"use client";

import { api } from "~/trpc/react";
import { TemplateSection } from "./template-section";
import { AccountSection } from "./account-section";
import { DebtSection } from "./debt-section";

export function ConfigContent() {
  const { data, isLoading } = api.config.getAll.useQuery();

  if (isLoading) {
    return (
      <div className="text-sm text-dusty-lavender-400">Loading config…</div>
    );
  }

  const templates = data?.templates ?? [];
  const accounts = data?.accounts ?? [];
  const debts = data?.debts ?? [];

  return (
    <div className="flex flex-col gap-10">
      <TemplateSection templates={templates} />
      <AccountSection accounts={accounts} />
      <DebtSection debts={debts} accounts={accounts} />
    </div>
  );
}
