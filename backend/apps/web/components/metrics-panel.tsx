import type { ApiResult, CacheMetrics, HealthStatus } from "@/lib/types";

type MetricsPanelProps = {
  metrics: ApiResult<CacheMetrics>;
  health: ApiResult<HealthStatus>;
};

export function MetricsPanel({ metrics, health }: MetricsPanelProps) {
  const data = metrics.data;
  const exactHits = data.exact_cache_hits ?? data.redis_hits ?? 0;
  const semanticHits = data.semantic_cache_hits ?? 0;
  const avoided = data.llm_calls_avoided ?? 0;
  const made = data.llm_calls_made ?? 0;
  const hitRate = data.cache_hit_rate ?? 0;

  return (
    <section className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Cache metrics</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Exact hits, semantic reuse, and avoided normalizer calls.
          </p>
        </div>
        <span
          className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
            health.ok
              ? "border-[var(--accent)] text-[var(--accent-strong)]"
              : "border-[#d6a553] text-[#8a6116]"
          }`}
        >
          {health.ok ? health.data.status ?? "online" : "offline"}
        </span>
      </div>

      {!metrics.ok ? (
        <p className="mt-4 rounded-md border border-[#d6a553] bg-[#fff6de] p-3 text-sm text-[#6f4c08] dark:bg-[#332811] dark:text-[#f6d58a]">
          Metrics unavailable: {metrics.error}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Metric label="Exact hits" value={String(exactHits)} />
        <Metric label="Semantic hits" value={String(semanticHits)} />
        <Metric label="LLM calls avoided" value={String(avoided)} />
        <Metric label="LLM calls made" value={String(made)} />
        <Metric label="Hit rate" value={`${Math.round(hitRate * 100)}%`} />
        <Metric
          label="Cost saved"
          value={`$${(data.estimated_cost_saved ?? 0).toFixed(4)}`}
        />
      </div>

      {!health.ok ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Health unavailable: {health.error}
        </p>
      ) : (
        <dl className="mt-4 grid gap-2 text-sm">
          <Status label="API" value={health.data.api ?? health.data.status} />
          <Status label="Redis/Valkey" value={health.data.redis ?? health.data.valkey} />
          <Status label="ChromaDB" value={health.data.chromadb} />
          <Status label="LLM mode" value={health.data.llm_mode} />
        </dl>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-3">
      <dt className="text-xs font-medium uppercase text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold">{value}</dd>
    </div>
  );
}

function Status({
  label,
  value,
}: {
  label: string;
  value?: string | boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-2">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="font-medium">{String(value ?? "unknown")}</dd>
    </div>
  );
}
