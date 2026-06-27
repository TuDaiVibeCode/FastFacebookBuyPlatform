import { formatPercent, formatVnd } from "@/lib/api";
import type { DealRecord } from "@/lib/types";
import { CacheBadge } from "./cache-badge";
import { TraceDisplay } from "./trace-display";

export function ResultPanel({ result }: { result: DealRecord | null }) {
  if (!result) {
    return (
      <section className="rounded-md border border-dashed border-[var(--border)] bg-[var(--panel)] p-5">
        <h2 className="text-base font-semibold">Analyze result</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Submit a raw post to see normalized item JSON, cache source, verdict,
          and pipeline trace.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{result.item.product_name}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {formatVnd(result.item.asking_price)} vs market{" "}
            {formatVnd(result.deal.market_price)}
          </p>
        </div>
        <CacheBadge cache={result.cache} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Verdict" value={result.deal.verdict} />
        <Metric label="Discount" value={formatPercent(result.deal.discount_pct)} />
        <Metric
          label="Confidence"
          value={
            typeof result.item.confidence === "number"
              ? result.item.confidence.toFixed(2)
              : "n/a"
          }
        />
      </div>

      <div className="mt-5">
        <h3 className="mb-3 text-sm font-semibold">Pipeline trace</h3>
        <TraceDisplay trace={result.trace} compact />
      </div>

      <div className="mt-5">
        <h3 className="mb-3 text-sm font-semibold">Normalized item</h3>
        <pre className="max-h-72 overflow-auto rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-3 text-xs leading-5">
          {JSON.stringify(result.item, null, 2)}
        </pre>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-3">
      <div className="text-xs font-medium uppercase text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
