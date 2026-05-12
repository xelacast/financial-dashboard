import { HydrateClient, api } from "~/trpc/server";
import { ConfigContent } from "./_components/config-content";

export default async function TrackerConfigPage() {
  void api.config.getAll.prefetch();

  return (
    <HydrateClient>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-grey-50">
            Tracker Configuration
          </h1>
          <p className="mt-1 text-sm text-dusty-lavender-400">
            Manage your recurring templates, accounts, and debts
          </p>
        </div>
        <ConfigContent />
      </div>
    </HydrateClient>
  );
}
