"use client";

import { FormEvent, useMemo, useState } from "react";
import type { AnalyzeResponse } from "@/lib/types";
import { ResultPanel } from "./result-panel";

const SAMPLES = [
  {
    label: "Fresh S23 Ultra",
    text: "pass ss s23 ultra 9tr xuoc dam nhe, gia hat de",
  },
  {
    label: "Repeat exact",
    text: "pass ss s23 ultra 9tr xuoc dam nhe, gia hat de",
  },
  {
    label: "Paraphrase",
    text: "can bay samsung s23u 9 trieu may con ngon, ai lay ib",
  },
  {
    label: "Sold post",
    text: "da ban iphone 13 pro 10tr, cam on anh em",
  },
];

export function DemoConsole() {
  const [text, setText] = useState(SAMPLES[0].text);
  const [source, setSource] = useState("sample");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => text.trim().length > 0 && !isSubmitting,
    [text, isSubmitting],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text.trim(), source }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Analyze request failed");
      }

      setResult(body as AnalyzeResponse);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Backend is unavailable",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <section className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Demo console</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Submit noisy resale text, then repeat or paraphrase it to show exact
            and semantic cache behavior.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {SAMPLES.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => setText(sample.text)}
              className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium hover:border-[var(--accent)]"
            >
              {sample.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Raw post
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={8}
              className="min-h-44 resize-y rounded-md border border-[var(--border)] bg-[var(--panel-strong)] p-3 text-sm leading-6 outline-none focus:border-[var(--accent)]"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Source
            <input
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </label>

          {error ? (
            <p className="rounded-md border border-[#d6a553] bg-[#fff6de] p-3 text-sm text-[#6f4c08] dark:bg-[#332811] dark:text-[#f6d58a]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="min-h-11 rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Analyzing..." : "Analyze post"}
          </button>
        </form>
      </section>

      <ResultPanel result={result} />
    </div>
  );
}
