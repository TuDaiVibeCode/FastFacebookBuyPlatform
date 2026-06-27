import { DealTable } from "@/components/deal-table";
import { DemoConsole } from "@/components/demo-console";
import { MetricsPanel } from "@/components/metrics-panel";
import { VerdictFilter } from "@/components/verdict-filter";
import { fetchDeals, fetchHealth, fetchMetrics } from "@/lib/api";
import type { Verdict } from "@/lib/types";

type PageProps = {
  searchParams?: Promise<{
    verdict?: Verdict;
    q?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [deals, metrics, health] = await Promise.all([
    fetchDeals({ verdict: params?.verdict, q: params?.q }),
    fetchMetrics(),
    fetchHealth(),
  ]);

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.7fr)]">
        <DemoConsole />
        <MetricsPanel metrics={metrics} health={health} />
      </section>

      <section className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-normal">Deal feed</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Server-rendered feed with cached backend reads and visible verdict math.
            </p>
          </div>
          <VerdictFilter active={params?.verdict} />
        </div>

        <DealTable deals={deals.data} error={deals.ok ? undefined : deals.error} />
      </section>
    </main>
  );
}
