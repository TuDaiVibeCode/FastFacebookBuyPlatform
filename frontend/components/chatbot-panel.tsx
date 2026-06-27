"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRotateRight,
  faBoltLightning,
  faPaperPlane,
  faPlus,
  faRobot,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

import { CacheBadge } from "@/components/cache-badge";
import { VerdictBadge } from "@/components/verdict-badge";
import { samplePosts } from "@/lib/mock-data";
import type { AnalyzeResponse } from "@/lib/types";
import { getStoredAuthToken } from "@/lib/api";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  result?: AnalyzeResponse;
};

export function ChatbotPanel() {
  const [text, setText] = useState<string>(samplePosts[0]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Share a product post and I will tell you if it is a good deal using current market prices.",
    },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const canSubmit = text.trim().length > 0 && !isAnalyzing;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isAnalyzing]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const prompt = text.trim();
    setError(null);
    setIsAnalyzing(true);
    setMessages((current) => [...current, { role: "user", content: prompt }]);

    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      const token = getStoredAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers,
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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analyze failed");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || !canSubmit) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  const latestResult = useMemo(
    () => [...messages].reverse().find((message) => message.result)?.result,
    [messages],
  );

  return (
    <section className="chat-shell min-w-0">
      <div className="chat-topbar">
        <div className="min-w-0">
          <h1>Deal Radar</h1>
        </div>
        <span className="status-dot">Ready</span>
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
        {isAnalyzing ? (
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
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {error ? <div className="chat-error">{error}</div> : null}

      <div className="prompt-strip" aria-label="Try sample posts">
        {samplePosts.map((post) => (
          <button key={post} type="button" onClick={() => setText(post)}>
            {post}
          </button>
        ))}
      </div>

      <form className="chat-composer" onSubmit={onSubmit} suppressHydrationWarning>
        <label htmlFor="chat-input" className="sr-only">
          Listing text
        </label>
        <div>
          <button
            type="button"
            className="composer-tool"
            aria-label="Use sample post"
            onClick={() => setText(samplePosts[0])}
            suppressHydrationWarning
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
          <textarea
            id="chat-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onInputKeyDown}
            rows={3}
            placeholder="Paste listing text here"
            suppressHydrationWarning
          />
          <button
            className="send-button"
            disabled={!canSubmit}
            aria-label="Check this listing"
            suppressHydrationWarning
          >
            <FontAwesomeIcon
              icon={isAnalyzing ? faArrowRotateRight : faPaperPlane}
              className={isAnalyzing ? "animate-spin" : ""}
            />
          </button>
        </div>
      </form>

      {latestResult ? (
        <div className="trace-line">
          <FontAwesomeIcon icon={faBoltLightning} />
          {latestResult.trace?.length
            ? latestResult.trace.map(humanizeTraceStep).join(" → ")
            : "Check complete"}
        </div>
      ) : null}
    </section>
  );
}

function ResultSummary({ result }: { result: AnalyzeResponse }) {
  const hasPriceContext = result.item.asking_price !== null || result.deal.market_price !== null;

  if (!hasPriceContext) {
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
        </dl>
      </div>
    );
  }

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
          <dt>Asking price</dt>
          <dd>{formatCurrency(result.item.asking_price)}</dd>
        </div>
        <div>
          <dt>Market price</dt>
          <dd>{formatCurrency(result.deal.market_price)}</dd>
        </div>
        <div>
          <dt>Save</dt>
          <dd>{result.deal.discount_pct ?? 0}%</dd>
        </div>
      </dl>
    </div>
  );
}

function buildReply(result: AnalyzeResponse) {
  if (result.assistant_reply && result.assistant_reply.trim()) {
    return result.assistant_reply;
  }

  const discount = result.deal.discount_pct ?? 0;
  const product = result.item.product_name;

  if (result.deal.verdict === "HOT_DEAL") {
    return `${product} is a good deal, about ${discount}% below market. Confirm condition and accessories before buying.`;
  }
  if (result.deal.verdict === "OK_DEAL") {
    return `${product} is fair, about ${discount}% below market. It may be worth a short price check with the seller.`;
  }
  return `${product} is not a great match for buying now. Ask for better price or compare another post.`;
}

function humanizeTraceStep(step: string) {
  const map: Record<string, string> = {
    redis_miss: "No saved quick result",
    semantic_miss: "No similar saved deal found",
    mock_llm: "Quick AI check",
    scored: "Price score calculated",
    stored: "Saved for faster checks next time",
    redis_hit: "Used saved quick result",
    semantic_hit: "Used similar saved result",
    returned_cached_response: "Loaded from saved result",
    ignored: "Marked as not a good deal",
    recomputed_score: "Price score rechecked",
  };

  return map[step] ?? step.replace(/_/g, " ");
}

function formatCurrency(value: number | null | undefined) {
  if (!value) return "n/a";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
