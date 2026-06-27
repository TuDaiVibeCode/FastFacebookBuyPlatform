import Link from "next/link";
import { formatFreshness, formatPercent, formatVnd } from "@/lib/api";
import type { DealRecord } from "@/lib/types";
import { CacheBadge } from "./cache-badge";

const VERDICT_STYLES = {
  HOT_DEAL: "text-[var(--hot)]",
  OK_DEAL: "text-[var(--ok)]",
  IGNORE: "text-[var(--ignore)]",
};

export function DealCard({ deal }: { deal: DealRecord }) {
  return (
    <article className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold">
            <Link href={`/deals/${deal.id}`} className="hover:text-[var(--accent)]">
              {deal.item.product_name}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {deal.item.brand ?? "Unknown brand"} · {deal.item.condition ?? "condition n/a"}
          </p>
        </div>
        <CacheBadge cache={deal.cache} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Ask" value={formatVnd(deal.item.asking_price)} />
        <Stat label="Market" value={formatVnd(deal.deal.market_price)} />
        <Stat label="Discount" value={formatPercent(deal.deal.discount_pct)} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className={`font-semibold ${VERDICT_STYLES[deal.deal.verdict]}`}>
          {deal.deal.verdict}
        </span>
        <span className="text-[var(--muted)]">
          {formatFreshness(deal.updated_at ?? deal.created_at)}
        </span>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-3">
      <div className="text-xs font-medium uppercase text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
