import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faClock } from "@fortawesome/free-solid-svg-icons";

import { CacheBadge } from "@/components/cache-badge";
import { VerdictBadge } from "@/components/verdict-badge";
import type { DealRecord } from "@/lib/types";

export function DealCard({ deal }: { deal: DealRecord }) {
  const askingPrice = formatCurrency(deal.item.asking_price);
  const marketPrice = formatCurrency(deal.deal.market_price);
  const discount = deal.deal.discount_pct;

  return (
    <Link
      href={`/deals/${deal.id}`}
      className="group grid min-w-0 gap-4 rounded-lg border border-zinc-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-50 hover:shadow-sm active:translate-y-px dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
    >
      <div className="flex flex-wrap items-center gap-2">
        <VerdictBadge verdict={deal.deal.verdict} />
        <CacheBadge cache={deal.cache} />
        {deal.freshness ? (
          <span className="inline-flex h-7 items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <FontAwesomeIcon icon={faClock} className="h-3 w-3" />
            Fresh {formatFreshness(deal.freshness)}
          </span>
        ) : null}
      </div>

      <div className="grid gap-1">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <h2 className="min-w-0 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {deal.item.product_name}
          </h2>
          <FontAwesomeIcon
            icon={faArrowRight}
            className="mt-1 h-4 w-4 text-zinc-400 transition group-hover:translate-x-1 group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
          />
        </div>
        <p className="line-clamp-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {deal.raw_post ?? `${deal.item.brand} ${deal.item.model}`}
        </p>
      </div>

      <div className="grid gap-3 border-t border-zinc-100 pt-3 sm:grid-cols-3 dark:border-zinc-800">
        <Metric label="Ask" value={askingPrice} />
        <Metric label="Market" value={marketPrice} />
        <Metric
          label="Discount"
          value={discount === null || discount === undefined ? "n/a" : `${discount}%`}
        />
      </div>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1 rounded-md bg-zinc-50 p-2 sm:bg-transparent sm:p-0 dark:bg-zinc-900 sm:dark:bg-transparent">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-500">{label}</span>
      <span className="break-words font-mono text-sm font-semibold text-zinc-950 dark:text-zinc-100">
        {value}
      </span>
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

function formatFreshness(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
