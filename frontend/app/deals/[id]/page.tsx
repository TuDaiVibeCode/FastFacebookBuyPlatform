import Link from "next/link";
import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCodeBranch,
  faFileCode,
} from "@fortawesome/free-solid-svg-icons";

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
    <main className="mx-auto grid w-full max-w-5xl gap-5 px-3 py-4 sm:px-4 sm:py-6 md:gap-6 md:px-6">
      <header className="grid min-w-0 gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
          Back to feed
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <VerdictBadge verdict={deal.deal.verdict} />
          <CacheBadge cache={deal.cache} />
          {deal.processing_ms ? (
            <span className="font-mono text-xs text-zinc-500">{deal.processing_ms}ms</span>
          ) : null}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50 sm:text-3xl">
            {deal.item.product_name}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {deal.raw_post ?? "Raw post unavailable"}
          </p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3 md:gap-4">
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

      <section className="grid min-w-0 gap-5 md:gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            <FontAwesomeIcon icon={faFileCode} className="h-4 w-4 text-sky-600" />
            Normalized item
          </h2>
          <pre className="mt-4 overflow-x-auto rounded-md bg-zinc-950 p-4 text-xs leading-6 text-zinc-100">
            {JSON.stringify(deal.item, null, 2)}
          </pre>
        </div>

        <div className="min-w-0 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            <FontAwesomeIcon icon={faCodeBranch} className="h-4 w-4 text-blue-600" />
            Processing trace
          </h2>
          <ol className="mt-4 grid gap-2">
            {(deal.trace ?? []).map((step, index) => (
              <li
                key={`${step}-${index}`}
                className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="font-mono text-xs text-zinc-500">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 break-words text-right font-medium text-zinc-800 dark:text-zinc-200">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
      <div className="text-sm font-medium text-zinc-500 dark:text-zinc-500">{label}</div>
      <div className="mt-2 break-words font-mono text-xl font-semibold text-zinc-950 dark:text-zinc-50 md:text-2xl">
        {value}
      </div>
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
