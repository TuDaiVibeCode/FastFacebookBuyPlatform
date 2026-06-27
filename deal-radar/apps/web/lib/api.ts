import { CACHE_TAGS } from "./cache-tags";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  ApiResult,
  CacheMetrics,
  DealsResponse,
  DealRecord,
  HealthStatus,
  Verdict,
} from "./types";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:18000";

const API_V1 = `${API_BASE_URL.replace(/\/$/, "")}/api/v1`;

const EMPTY_METRICS: CacheMetrics = {
  exact_cache_hits: 0,
  semantic_cache_hits: 0,
  llm_calls_avoided: 0,
  llm_calls_made: 0,
  estimated_cost_saved: 0,
  cache_hit_rate: 0,
};

export function formatVnd(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Unknown";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "n/a";
  }

  return `${Math.round(value)}%`;
}

export function formatFreshness(value?: string | null) {
  if (!value) {
    return "No timestamp";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function fetchDeals(params?: {
  verdict?: Verdict;
  q?: string;
  limit?: number;
}): Promise<ApiResult<DealRecord[]>> {
  const search = new URLSearchParams();
  if (params?.verdict) search.set("verdict", params.verdict);
  if (params?.q) search.set("q", params.q);
  search.set("limit", String(params?.limit ?? 20));

  const result = await request<DealsResponse>(
    `/deals?${search.toString()}`,
    {
      next: { revalidate: 30, tags: [CACHE_TAGS.deals] },
    },
    [],
  );

  if (!result.ok) {
    return { ok: false, data: [], error: result.error };
  }

  return { ok: true, data: normalizeDeals(result.data) };
}

export async function fetchDeal(id: string): Promise<ApiResult<DealRecord | null>> {
  return request<DealRecord>(
    `/deals/${encodeURIComponent(id)}`,
    {
      next: { revalidate: 300, tags: [CACHE_TAGS.deal(id)] },
    },
    null,
  );
}

export async function fetchMetrics(): Promise<ApiResult<CacheMetrics>> {
  return request<CacheMetrics>(
    "/metrics/cache",
    {
      next: { revalidate: 15, tags: [CACHE_TAGS.deals] },
    },
    EMPTY_METRICS,
  );
}

export async function fetchHealth(): Promise<ApiResult<HealthStatus>> {
  return request<HealthStatus>(
    "/health",
    {
      next: { revalidate: 15 },
    },
    { status: "unavailable" },
  );
}

export async function analyzePost(
  payload: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_V1}/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await safeError(response);
    throw new Error(message || `Backend analyze failed with ${response.status}`);
  }

  return response.json() as Promise<AnalyzeResponse>;
}

async function request<T>(
  path: string,
  init: RequestInit,
  fallback: T,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_V1}${path}`, init);
    if (!response.ok) {
      const message = await safeError(response);
      return {
        ok: false,
        data: fallback,
        error: message || `Backend returned ${response.status}`,
      };
    }

    return { ok: true, data: (await response.json()) as T };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Backend is unavailable";
    return { ok: false, data: fallback, error: message };
  }
}

async function safeError(response: Response) {
  try {
    const body = (await response.json()) as { detail?: unknown; message?: unknown };
    if (typeof body.detail === "string") return body.detail;
    if (typeof body.message === "string") return body.message;
    return JSON.stringify(body);
  } catch {
    return response.statusText;
  }
}

function normalizeDeals(response: DealsResponse): DealRecord[] {
  if (Array.isArray(response)) return response;
  return response.items ?? response.deals ?? response.results ?? [];
}
