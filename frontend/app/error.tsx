"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { AppSidebar } from "@/components/app-sidebar";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="app-frame">
      <AppSidebar active="browse" />
      <section className="content-shell">
        <div className="state-panel">
          <div className="state-icon danger">
            <FontAwesomeIcon icon={faTriangleExclamation} />
          </div>
          <h1>Something went wrong</h1>
          <p>{error.message || "Deal Radar could not render this view."}</p>
          <button onClick={reset}>Retry</button>
        </div>
      </section>
    </main>
  );
}
