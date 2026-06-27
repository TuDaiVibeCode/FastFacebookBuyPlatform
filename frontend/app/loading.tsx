import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

export default function Loading() {
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-3 py-4 sm:px-4 sm:py-6 md:px-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
        <div className="flex items-center gap-3 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
          <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
          Loading Deal Radar
        </div>
        <div className="mt-6 grid gap-3">
          <div className="h-24 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-24 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-24 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-900" />
        </div>
      </section>
    </main>
  );
}
