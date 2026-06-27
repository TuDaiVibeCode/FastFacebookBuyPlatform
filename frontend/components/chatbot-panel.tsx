"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRotateRight,
  faBoltLightning,
  faPaperPlane,
  faRobot,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

import { CacheBadge } from "@/components/cache-badge";
import { VerdictBadge } from "@/components/verdict-badge";
import { samplePosts } from "@/lib/mock-data";
import type { AnalyzeResponse } from "@/lib/types";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  result?: AnalyzeResponse;
};

export function ChatbotPanel() {
  const router = useRouter();
  const [text, setText] = useState<string>(samplePosts[0]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Paste marketplace post. I will extract product, compare market price, and explain whether deal is worth buying.",
    },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canSubmit = text.trim().length > 0 && !isAnalyzing && !isPending;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const prompt = text.trim();
    setError(null);
    setIsAnalyzing(true);
    setMessages((current) => [...current, { role: "user", content: prompt }]);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: prompt, source: "sample" }),
      });
      const data = (await response.json()) as AnalyzeResponse | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Analyze failed");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: buildReply(data),
          result: data,
        },
      ]);
      setText("");
      startTransition(() => router.refresh());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analyze failed");
    } finally {
      setIsAnalyzing(false);
    }
  }

  const latestResult = useMemo(
    () => [...messages].reverse().find((message) => message.result)?.result,
    [messages],
  );

  return (
    <section className="chat-shell min-w-0">
      <div className="chat-topbar">
        <div className="brand-mark">
          <FontAwesomeIcon icon={faRobot} className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h1>Deal Radar chat</h1>
          <p>AI buyer assistant for resale listings</p>
        </div>
        <span className="status-dot">Mock live</span>
      </div>

      <div className="prompt-strip">
        {samplePosts.map((post) => (
          <button key={post} type="button" onClick={() => setText(post)}>
            {post}
          </button>
        ))}
      </div>

      <div className="message-list" aria-live="polite">
        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`message ${message.role}`}>
            <div className="message-avatar">
              <FontAwesomeIcon icon={message.role === "assistant" ? faRobot : faUser} />
            </div>
            <div className="message-body">
              <p>{message.content}</p>
              {message.result ? <ResultSummary result={message.result} /> : null}
            </div>
          </article>
        ))}
        {isAnalyzing || isPending ? (
          <article className="message assistant">
            <div className="message-avatar">
              <FontAwesomeIcon icon={faRobot} />
            </div>
            <div className="message-body skeleton-copy">
              <span />
              <span />
            </div>
          </article>
        ) : null}
      </div>

      {error ? <div className="chat-error">{error}</div> : null}

      <form className="chat-composer" onSubmit={onSubmit}>
        <label htmlFor="chat-input">Marketplace post</label>
        <div>
          <textarea
            id="chat-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            placeholder="Paste resale post here"
          />
          <button disabled={!canSubmit} aria-label="Analyze post">
            <FontAwesomeIcon
              icon={isAnalyzing || isPending ? faArrowRotateRight : faPaperPlane}
              className={isAnalyzing || isPending ? "animate-spin" : ""}
            />
          </button>
        </div>
      </form>

      {latestResult ? (
        <div className="trace-line">
          <FontAwesomeIcon icon={faBoltLightning} />
          {latestResult.trace?.join(" -> ") ?? "analysis complete"}
        </div>
      ) : null}
    </section>
  );
}

function ResultSummary({ result }: { result: AnalyzeResponse }) {
  return (
    <div className="result-summary">
      <div className="flex flex-wrap gap-2">
        <VerdictBadge verdict={result.deal.verdict} />
        <CacheBadge cache={result.cache} />
      </div>
      <dl>
        <div>
          <dt>Product</dt>
          <dd>{result.item.product_name}</dd>
        </div>
        <div>
          <dt>Ask</dt>
          <dd>{formatCurrency(result.item.asking_price)}</dd>
        </div>
        <div>
          <dt>Market</dt>
          <dd>{formatCurrency(result.deal.market_price)}</dd>
        </div>
        <div>
          <dt>Discount</dt>
          <dd>{result.deal.discount_pct ?? 0}%</dd>
        </div>
      </dl>
    </div>
  );
}

function buildReply(result: AnalyzeResponse) {
  const discount = result.deal.discount_pct ?? 0;
  if (result.deal.verdict === "HOT_DEAL") {
    return `${result.item.product_name} looks under market by ${discount}%. Move fast, but verify IMEI, battery, and seller history.`;
  }
  if (result.deal.verdict === "OK_DEAL") {
    return `${result.item.product_name} is fair, not urgent. Negotiate before pickup.`;
  }
  return `${result.item.product_name} does not clear deal threshold. Better options likely exist.`;
}

function formatCurrency(value: number | null | undefined) {
  if (!value) return "n/a";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
