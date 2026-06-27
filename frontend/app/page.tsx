import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faCartShopping,
  faMagnifyingGlass,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";

import { AppSidebar } from "@/components/app-sidebar";
import { CacheBadge } from "@/components/cache-badge";
import { VerdictBadge } from "@/components/verdict-badge";
import { getCacheMetrics, getDeals } from "@/lib/api";
import type { DealRecord, Verdict } from "@/lib/types";

const verdicts = new Set(["ALL", "HOT_DEAL", "OK_DEAL", "IGNORE"]);

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ verdict?: string; q?: string }>;
}) {
  const { verdict: rawVerdict, q = "" } = await searchParams;
  const activeVerdict = verdicts.has(rawVerdict ?? "")
    ? (rawVerdict as Verdict | "ALL")
    : "ALL";

  const [deals, metrics] = await Promise.all([
    getDeals({ verdict: activeVerdict, q, limit: 20 }),
    getCacheMetrics(),
  ]);

  return (
    <main className="app-frame">
      <AppSidebar active="browse" />

      <section className="content-shell">
        <section className="market-panel">
          <div className="market-header">
          <div>
              <p className="market-kicker">Marketplace</p>
              <h1>Browse deals</h1>
              <span>
                {deals.items.length} listings, {Math.round(metrics.cache_hit_rate * 100)}% checked fast
              </span>
            </div>
            <Link href="/chat" className="market-cta">
              Ask AI
              <FontAwesomeIcon icon={faArrowRight} />
            </Link>
          </div>

          <form className="market-search">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <input name="q" defaultValue={q} placeholder="Search phone, laptop, console" />
            <button>
              <FontAwesomeIcon icon={faSliders} />
              Filter
            </button>
          </form>

          <div className="filter-row">
            <FilterLink label="All" value="ALL" active={activeVerdict} />
            <FilterLink label="Good deal" value="HOT_DEAL" active={activeVerdict} />
            <FilterLink label="Fair deal" value="OK_DEAL" active={activeVerdict} />
            <FilterLink label="Skip" value="IGNORE" active={activeVerdict} />
          </div>

          {deals.items.length > 0 ? (
            <div className="product-grid">
              {deals.items.map((deal, index) => (
                <ProductCard key={deal.id} deal={deal} index={index} />
              ))}
            </div>
          ) : (
            <div className="empty-market">
              No listings right now. Add a post in Chat to find more deals.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function FilterLink({
  label,
  value,
  active,
}: {
  label: string;
  value: Verdict | "ALL";
  active: Verdict | "ALL";
}) {
  const href = value === "ALL" ? "/" : `/?verdict=${value}`;
  return (
    <Link href={href} className={active === value ? "active" : ""}>
      {label}
    </Link>
  );
}

function ProductCard({ deal, index }: { deal: DealRecord; index: number }) {
  const askingPrice = formatCurrency(deal.item.asking_price);
  const marketPrice = formatCurrency(deal.deal.market_price);
  const discount = deal.deal.discount_pct ?? 0;

  return (
    <Link href={`/deals/${deal.id}`} className="product-card">
      <div className={`product-art product-art-${(index % 4) + 1}`}>
        <FontAwesomeIcon icon={faCartShopping} />
        <span>{deal.item.brand}</span>
      </div>
      <div className="product-copy">
        <div className="badge-line">
          <VerdictBadge verdict={deal.deal.verdict} />
          <CacheBadge cache={deal.cache} />
        </div>
        <h3>{deal.item.product_name}</h3>
        <p>{deal.raw_post ?? `${deal.item.brand} ${deal.item.model}`}</p>
        <div className="price-row">
          <strong>{askingPrice}</strong>
          <span>{discount}% off market</span>
        </div>
        <div className="meta-row">
          <span>{marketPrice} market</span>
          <span>{deal.item.location ?? "Vietnam"}</span>
        </div>
      </div>
    </Link>
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
