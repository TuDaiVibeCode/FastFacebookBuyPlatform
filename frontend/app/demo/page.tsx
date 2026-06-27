import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faVialCircleCheck } from "@fortawesome/free-solid-svg-icons";

import { AppSidebar } from "@/components/app-sidebar";
import { DemoConsole } from "@/components/demo-console";
import { MetricsPanel } from "@/components/metrics-panel";
import { getCacheMetrics, getHealth } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const [metrics, health] = await Promise.all([getCacheMetrics(), getHealth()]);

  return (
    <main className="app-frame">
      <AppSidebar active="demo" />
      <section className="content-shell">
        <header className="market-panel compact-panel mb-5">
          <div className="market-header">
            <div className="min-w-0">
              <p className="market-kicker">
                <FontAwesomeIcon icon={faVialCircleCheck} className="mr-2 h-3.5 w-3.5" />
                Demo
              </p>
              <h1>Analyze noisy resale posts</h1>
              <span>Show miss, Redis hit, and semantic hit without live scraping.</span>
            </div>
            <Link href="/" className="market-cta">
              <FontAwesomeIcon icon={faArrowLeft} />
              Browse
            </Link>
          </div>
        </header>

        <div className="grid min-w-0 gap-5 md:gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <DemoConsole />
          <MetricsPanel metrics={metrics} health={health} />
        </div>
      </section>
    </main>
  );
}
