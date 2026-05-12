import { HydrateClient, api } from "~/trpc/server";
import { TrackerContent } from "./_components/tracker-content";

export const metadata = {
  title: "Finance Tracker",
};

export default async function TrackerPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  void api.tracker.getYear.prefetch({ year });
  void api.tracker.getMonth.prefetch({ year, month });
  void api.config.getAll.prefetch();

  return (
    <HydrateClient>
      <TrackerContent />
    </HydrateClient>
  );
}
