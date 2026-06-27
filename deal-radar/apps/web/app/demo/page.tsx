import { DemoConsole } from "@/components/demo-console";
import { MetricsPanel } from "@/components/metrics-panel";
import { fetchHealth, fetchMetrics } from "@/lib/api";

export default async function DemoPage() {
  const [metrics, health] = await Promise.all([fetchMetrics(), fetchHealth()]);

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <DemoConsole />
      <MetricsPanel metrics={metrics} health={health} />
    </main>
  );
}
