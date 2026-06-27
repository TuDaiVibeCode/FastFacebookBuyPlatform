"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRotateRight,
  faFlask,
  faPaperPlane,
  faRoute,
} from "@fortawesome/free-solid-svg-icons";

import { CacheBadge } from "@/components/cache-badge";
import { VerdictBadge } from "@/components/verdict-badge";
import { samplePosts } from "@/lib/mock-data";
import type { AnalyzeResponse } from "@/lib/types";

export function DemoConsole() {
  const router = useRouter();
  const [text, setText] = useState<string>(samplePosts[0]);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canSubmit = text.trim().length > 0 && !isAnalyzing && !isPending;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, source: "sample" }),
      });

      const data = (await response.json()) as AnalyzeResponse | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Analyze failed");
      }

      setResult(data);
      startTransition(() => router.refresh());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analyze failed");
    } finally {
      setIsAnalyzing(false);
    }
  }

  const trace = useMemo(() => result?.trace ?? [], [result]);

  return (
    <section className="grid min-w-0 gap-5 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          <FontAwesomeIcon icon={faFlask} className="h-4 w-4 text-sky-600" />
          Analyze console
        </h2>
        <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Submit exact and paraphrased posts to show cache savings.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {samplePosts.map((post) => (
          <button
            key={post}
            type="button"
            onClick={() => setText(post)}
            className="inline-flex min-w-0 items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-left text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 active:translate-y-px dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <FontAwesomeIcon icon={faRoute} className="h-3 w-3 shrink-0 text-zinc-400" />
            <span className="min-w-0 truncate">{post}</span>
          </button>
        ))}
      </div>

      <form className="grid gap-3" onSubmit={onSubmit}>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Raw post
          </span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={5}
            className="resize-none rounded-lg border border-zinc-300 bg-white p-3 text-sm leading-6 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-100"
            placeholder="pass ss s23 ultra 9tr xuoc dam nhe"
          />
        </label>
        <button
          disabled={!canSubmit}
          className="h-11 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 active:translate-y-px disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <FontAwesomeIcon
              icon={isAnalyzing || isPending ? faArrowRotateRight : faPaperPlane}
              className={`h-4 w-4 ${isAnalyzing || isPending ? "animate-spin" : ""}`}
            />
            {isAnalyzing ? "Analyzing" : isPending ? "Refreshing feed" : "Analyze post"}
          </span>
        </button>
      </form>

      {error ? (
        <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="grid min-w-0 gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center gap-2">
            <VerdictBadge verdict={result.deal.verdict} />
            <CacheBadge cache={result.cache} />
            <span className="font-mono text-xs text-zinc-500">
              {result.processing_ms ?? 0}ms
            </span>
          </div>

          <div>
            <h3 className="font-semibold text-zinc-950 dark:text-zinc-50">
              {result.item.product_name}
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {formatCurrency(result.item.asking_price)} ask vs{" "}
              {formatCurrency(result.deal.market_price)} market,{" "}
              {result.deal.discount_pct ?? 0}% discount.
            </p>
          </div>

          <ol className="grid min-w-0 gap-2">
            {trace.map((step, index) => (
              <li
                key={`${step}-${index}`}
                className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <span className="font-mono text-xs text-zinc-500">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 break-words text-right font-medium text-zinc-800 dark:text-zinc-200">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Result appears here after analysis.
        </div>
      )}
    </section>
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
