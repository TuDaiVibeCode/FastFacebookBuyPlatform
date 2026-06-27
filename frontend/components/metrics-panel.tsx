import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartSimple,
  faDatabase,
  faHeartPulse,
  faLayerGroup,
  faPiggyBank,
} from "@fortawesome/free-solid-svg-icons";

import type { CacheMetrics, HealthStatus } from "@/lib/types";

export function MetricsPanel({
  metrics,
  health,
}: {
  metrics: CacheMetrics;
  health: HealthStatus;
}) {
  return (
    <section className="grid min-w-0 gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          <FontAwesomeIcon icon={faPiggyBank} className="h-4 w-4 text-blue-600" />
          Deal activity
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          These numbers help check how fast the app can reuse earlier work.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Metric
          icon={faChartSimple}
          label="Hit rate"
          value={`${Math.round(metrics.cache_hit_rate * 100)}%`}
        />
        <Metric icon={faDatabase} label="Saved quick checks" value={String(metrics.exact_cache_hits)} />
        <Metric
          icon={faLayerGroup}
          label="Smart matches"
          value={String(metrics.semantic_cache_hits)}
        />
        <Metric icon={faPiggyBank} label="AI checks skipped" value={String(metrics.llm_calls_avoided)} />
      </div>

      <div className="grid gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <HealthRow label="Service" value={health.api} />
        <HealthRow label="Cache" value={health.redis} />
        <HealthRow label="Search index" value={health.chromadb} />
        <HealthRow label="Mode" value={modeLabel(health.llm_mode)} />
      </div>
    </section>
  );
}

function modeLabel(mode: string) {
  if (mode === "real") return "Live";
  if (mode === "mock") return "Demo";
  return "Checking";
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: typeof faChartSimple;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-500">
        <FontAwesomeIcon icon={icon} className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 break-words font-mono text-xl font-semibold text-zinc-950 dark:text-zinc-50">
        {value}
      </div>
    </div>
  );
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <span className="inline-flex items-center gap-2 font-mono font-semibold text-zinc-950 dark:text-zinc-100">
        <FontAwesomeIcon icon={faHeartPulse} className="h-3 w-3 text-blue-600" />
        {value}
      </span>
    </div>
  );
}
