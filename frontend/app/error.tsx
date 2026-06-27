"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto grid w-full max-w-3xl px-4 py-10 md:px-6">
      <section className="rounded-lg border border-rose-300 bg-white p-6 dark:border-rose-900 dark:bg-zinc-950">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faTriangleExclamation} className="h-5 w-5 text-rose-600" />
          <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
            Frontend error
          </h1>
        </div>
        <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {error.message || "Deal Radar could not render this view."}
        </p>
        <button
          onClick={reset}
          className="mt-5 h-10 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 active:translate-y-px dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
