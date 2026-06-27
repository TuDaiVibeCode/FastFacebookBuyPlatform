import Link from "next/link";
import { notFound } from "next/navigation";
import { CacheBadge } from "@/components/cache-badge";
import { TraceDisplay } from "@/components/trace-display";
import { formatFreshness, formatPercent, formatVnd, fetchDeal } from "@/lib/api";

type DealDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function DealDetailPage({ params }: DealDetailProps) {
  const { id } = await params;
  const result = await fetchDeal(id);

  if (result.ok && !result.data) {
    notFound();
  }

  if (!result.ok) {
    return (
      <main className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-medium text-[var(--accent-strong)]">
          Back to dashboard
        </Link>
        <section className="rounded-md border border-[#d6a553] bg-[#fff6de] p-5 text-[#6f4c08] dark:bg-[#332811] dark:text-[#f6d58a]">
          Detail unavailable: {result.error}
        </section>
      </main>
    );
  }

  const deal = result.data;
  if (!deal) notFound();

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <Link href="/" className="text-sm font-medium text-[var(--accent-strong)]">
        Back to dashboard
      </Link>

      <section className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              {deal.item.product_name}
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {deal.source ?? "sample"} ·{" "}
              {formatFreshness(deal.updated_at ?? deal.created_at)}
            </p>
          </div>
          <CacheBadge cache={deal.cache} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Metric label="Ask" value={formatVnd(deal.item.asking_price)} />
          <Metric label="Market" value={formatVnd(deal.deal.market_price)} />
          <Metric label="Discount" value={formatPercent(deal.deal.discount_pct)} />
          <Metric label="Verdict" value={deal.deal.verdict} />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5">
          <h2 className="text-base font-semibold">Raw post</h2>
          <p className="mt-3 whitespace-pre-wrap rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-3 text-sm leading-6">
            {deal.raw_text ?? "Raw post text was not included by the backend."}
          </p>

          <h2 className="mt-5 text-base font-semibold">Discount formula</h2>
          <p className="mt-3 rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-3 font-mono text-sm">
            ({formatVnd(deal.deal.market_price)} -{" "}
            {formatVnd(deal.item.asking_price)}) /{" "}
            {formatVnd(deal.deal.market_price)} ={" "}
            {formatPercent(deal.deal.discount_pct)}
          </p>
        </div>

        <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5">
          <h2 className="text-base font-semibold">Normalized item</h2>
          <pre className="mt-3 max-h-96 overflow-auto rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-3 text-xs leading-5">
            {JSON.stringify(deal.item, null, 2)}
          </pre>
        </div>
      </section>

      <section className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5">
        <h2 className="mb-3 text-base font-semibold">Processing trace</h2>
        <TraceDisplay trace={deal.trace} compact />
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-3">
      <div className="text-xs font-medium uppercase text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold">{value}</div>
    </div>
  );
}
