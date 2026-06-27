import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

import { AppSidebar } from "@/components/app-sidebar";

export default function NotFound() {
  return (
    <main className="app-frame">
      <AppSidebar active="browse" />
      <section className="content-shell">
        <div className="state-panel">
          <div className="state-icon">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
          </div>
          <h1>Page not found</h1>
          <p>Page is missing or the link is not valid.</p>
          <Link href="/">Back to deals</Link>
        </div>
      </section>
    </main>
  );
}
