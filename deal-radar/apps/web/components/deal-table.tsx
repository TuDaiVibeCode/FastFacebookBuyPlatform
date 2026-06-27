import type { DealRecord } from "@/lib/types";
import { DealCard } from "./deal-card";

export function DealTable({
  deals,
  error,
}: {
  deals: DealRecord[];
  error?: string;
}) {
  if (error) {
    return (
      <div className="rounded-md border border-[#d6a553] bg-[#fff6de] p-4 text-sm text-[#6f4c08] dark:bg-[#332811] dark:text-[#f6d58a]">
        Backend feed unavailable: {error}
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--panel)] p-8 text-center">
        <h3 className="text-base font-semibold">No deals yet</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Run an analysis in the demo console to populate the feed.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {deals.map((deal) => (
        <DealCard key={deal.id} deal={deal} />
      ))}
    </div>
  );
}
