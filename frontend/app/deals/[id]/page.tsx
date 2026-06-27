import Link from "next/link";
import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCodeBranch,
  faFileCode,
} from "@fortawesome/free-solid-svg-icons";

import { AppSidebar } from "@/components/app-sidebar";
import { CacheBadge } from "@/components/cache-badge";
import { VerdictBadge } from "@/components/verdict-badge";
import { getDeal } from "@/lib/api";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = await getDeal(id);

  if (!deal) notFound();

  return (
    <main className="app-frame">
      <AppSidebar active="browse" />
      <section className="content-shell deal-detail">
        <header className="detail-hero">
          <Link href="/" className="detail-back">
            <FontAwesomeIcon icon={faArrowLeft} />
            Back to deals
          </Link>
          <div className="badge-line">
            <VerdictBadge verdict={deal.deal.verdict} />
            <CacheBadge cache={deal.cache} />
            {deal.processing_ms ? (
              <span className="detail-chip">{deal.processing_ms}ms</span>
            ) : null}
          </div>
          <div>
            <h1>{deal.item.product_name}</h1>
            <p>{deal.raw_post ?? "No listing text available."}</p>
          </div>
        </header>

        <section className="metric-grid">
          <Metric label="Asking price" value={formatCurrency(deal.item.asking_price)} />
          <Metric label="Market price" value={formatCurrency(deal.deal.market_price)} />
          <Metric
            label="Discount"
            value={
              deal.deal.discount_pct === null || deal.deal.discount_pct === undefined
                ? "n/a"
                : `${deal.deal.discount_pct}%`
            }
          />
        </section>

        <section className="detail-grid">
          <div className="detail-panel">
            <h2>
              <FontAwesomeIcon icon={faFileCode} />
              Product details
            </h2>
            <pre>
              {JSON.stringify(deal.item, null, 2)}
            </pre>
          </div>

          <div className="detail-panel">
            <h2>
              <FontAwesomeIcon icon={faCodeBranch} />
              What happened
            </h2>
            <ol className="trace-list">
              {(deal.trace ?? []).map((step, index) => (
                <li key={`${step}-${index}`}>
                  <span>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <strong>{humanizeTraceStep(step)}</strong>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatCurrency(value: number | null | undefined) {
  if (!value) return "n/a";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function humanizeTraceStep(step: string) {
  const map: Record<string, string> = {
    redis_miss: "No saved deal found yet",
    semantic_miss: "No similar saved deal found",
    mock_llm: "Quick AI check",
    scored: "Price score calculated",
    stored: "Saved for next time",
    redis_hit: "Used quick saved result",
    semantic_hit: "Used similar saved result",
    returned_cached_response: "Loaded from saved result",
    ignored: "Marked as not a good deal",
    recomputed_score: "Price score rechecked",
  };

  return map[step] ?? step.replace(/_/g, " ");
}
