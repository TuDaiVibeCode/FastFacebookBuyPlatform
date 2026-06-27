import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  getMockDeal,
  getMockDeals,
  getMockMetrics,
  mockHealth,
} from "@/lib/mock-data";
import type {
  CacheMetrics,
  DealRecord,
  DealsResponse,
  HealthStatus,
  Verdict,
} from "@/lib/types";

export const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:18000";

const AUTH_STORAGE_KEY = "deal-radar-access-token";

type BackendPayload = {
  id?: string;
  cache?: string;
  raw_text?: string;
  raw_post?: string;
  source?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
  freshness?: string | null;
  freshness_seconds?: number | null;
  processing_ms?: number | null;
  trace?: unknown[];
  item?: {
    product_name?: string | null;
    brand?: string | null;
    model?: string | null;
    condition?: string | null;
    asking_price?: number | null;
    sold_status?: boolean;
    confidence?: number | null;
    location?: string | null;
    raw_text_hash?: string | null;
  };
  deal?: {
    market_price?: number | null;
    discount_pct?: number | null;
    verdict?: string | null;
  };
  product_name?: string | null;
  asking_price?: number | null;
  market_price?: number | null;
  discount_pct?: number | null;
  verdict?: string;
  brand?: string | null;
  model?: string | null;
  condition?: string | null;
  sold_status?: boolean;
  confidence?: number | null;
  location?: string | null;
  raw_text_hash?: string | null;
};

type BackendDealCard = BackendPayload;
type BackendAnalyzeLike = BackendPayload;

type BackendDealFeedResponse = {
  items?: BackendDealCard[];
  next_cursor?: string | null;
};

type BackendHealth = {
  api?: string;
  exact_cache?: string;
  semantic_cache?: string;
  llm_mode?: string;
  sample_data_loaded?: boolean;
  market_price_count?: number;
};

type FetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  revalidate?: number;
  tags?: string[];
  auth?: boolean;
  headers?: Record<string, string>;
  body?: string;
};

export type AuthRequest = {
  email: string;
  password: string;
};

export type AuthTokenResponse = {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    created_at: string;
  };
};

export async function registerUser(payload: AuthRequest): Promise<AuthTokenResponse> {
  const response = await fetchJson<AuthTokenResponse>("/api/v1/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  setStoredAuthToken(response.access_token);
  return response;
}

export async function loginUser(payload: AuthRequest): Promise<AuthTokenResponse> {
  const response = await fetchJson<AuthTokenResponse>("/api/v1/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  setStoredAuthToken(response.access_token);
  return response;
}

export async function getCurrentUser(): Promise<AuthTokenResponse["user"]> {
  return fetchJson<AuthTokenResponse["user"]>("/api/v1/auth/me", {
    auth: true,
  });
}

export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_STORAGE_KEY);
}

export function setStoredAuthToken(token: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

export async function getDeals(filters?: {
  verdict?: Verdict | "ALL";
  q?: string;
  limit?: number;
  cursor?: string;
}): Promise<DealsResponse> {
  const search = new URLSearchParams();
  if (filters?.verdict && filters.verdict !== "ALL") {
    search.set("verdict", filters.verdict);
  }
  if (filters?.q) search.set("q", filters.q);
  if (filters?.limit) search.set("limit", String(filters.limit));
  if (filters?.cursor) search.set("cursor", filters.cursor);

  const suffix = search.toString() ? `?${search.toString()}` : "";
  const fallback = getMockDeals(filters?.verdict);

  return fetchJson<BackendDealFeedResponse | BackendDealCard[]>(`/api/v1/deals${suffix}`, {
    revalidate: 30,
    tags: [CACHE_TAGS.deals],
    auth: true,
  })
    .then((data) => {
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : [];
      return {
        items: items.map(normalizeDealRecord),
        next_cursor: Array.isArray(data) ? null : (data?.next_cursor ?? null),
      } satisfies DealsResponse;
    })
    .catch(() => fallback);
}

export async function getDeal(id: string): Promise<DealRecord | null> {
  return fetchJson<BackendAnalyzeLike>(`/api/v1/deals/${id}`, {
    revalidate: 300,
    tags: [CACHE_TAGS.deal(id)],
    auth: true,
  })
    .then(normalizeDealRecord)
    .catch(() => getMockDeal(id));
}

export async function getCacheMetrics(): Promise<CacheMetrics> {
  return fetchJson<CacheMetrics>("/api/v1/cache/metrics", {
    revalidate: 30,
    tags: [CACHE_TAGS.deals],
    auth: true,
  }).catch(() => getMockMetrics());
}

export async function getHealth(): Promise<HealthStatus> {
  return fetchJson<BackendHealth>("/api/v1/health", {
    revalidate: 15,
    tags: [CACHE_TAGS.deals],
    auth: true,
  })
    .then(normalizeHealth)
    .catch(() => mockHealth);
}

async function fetchJson<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  if (options.auth) {
    const token = getStoredAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const requestInit: RequestInit = {
    method: options.method,
    body: options.body,
    headers,
  };

  if (options.revalidate !== undefined || options.tags !== undefined) {
    requestInit.next = {
      revalidate: options.revalidate,
      tags: options.tags,
    };
  };

  const response = await fetch(`${API_BASE_URL}${path}`, requestInit);

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function normalizeDealRecord(payload: BackendAnalyzeLike | BackendDealCard): DealRecord {
  const source = Array.isArray(payload?.trace) ? payload.trace : [];
  const trace = source.filter((step): step is string => typeof step === "string");
  const sourceLabel = resolveSource(payload.source);
  const verdict = parseVerdict(
    "deal" in payload ? payload.deal?.verdict ?? payload.verdict : payload.verdict
  );
  const productName = payload.item?.product_name ?? payload.product_name ?? "Unknown listing";
  const askingPrice = pickNumber(payload.item?.asking_price ?? payload.asking_price);
  const marketPrice = pickNumber(payload.deal?.market_price ?? payload.market_price);
  const discountPct = pickNumber(
    payload.deal?.discount_pct ?? payload.discount_pct,
    true
  );
  const freshness = payload.freshness ?? toFreshnessIso(payload.freshness_seconds);
  const createdAt = payload.created_at ? payload.created_at : undefined;
  const updatedAt = payload.updated_at ? payload.updated_at : undefined;
  const cache = parseCache(payload.cache);

  return {
    id: typeof payload.id === "string" && payload.id.length > 0 ? payload.id : `deal-${Date.now()}`,
    cache,
    item: {
      product_name: productName,
      brand: payload.item?.brand ?? undefined,
      model: payload.item?.model ?? undefined,
      condition: payload.item?.condition ?? "unknown",
      asking_price: askingPrice,
      sold_status: Boolean(payload.item?.sold_status),
      confidence: clamp01(payload.item?.confidence),
      location: payload.item?.location ?? undefined,
    },
    deal: {
      market_price: marketPrice,
      discount_pct: discountPct,
      verdict,
    },
    raw_post: typeof payload.raw_post === "string" ? payload.raw_post : typeof payload.raw_text === "string" ? payload.raw_text : undefined,
    source: sourceLabel,
    freshness: freshness,
    trace: trace,
    processing_ms: typeof payload.processing_ms === "number" ? payload.processing_ms : undefined,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function parseVerdict(value: unknown): Verdict {
  if (value === "HOT_DEAL" || value === "OK_DEAL" || value === "IGNORE") {
    return value;
  }
  return "IGNORE";
}

function parseCache(value: unknown): DealRecord["cache"] {
  if (value === "redis_hit" || value === "semantic_hit") return value;
  return "miss";
}

function pickNumber(value: unknown, allowFloat = false): number | null {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return null;
  }
  if (!allowFloat) {
    return Math.trunc(value);
  }
  return value;
}

function clamp01(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function resolveSource(source: unknown): string | undefined {
  if (typeof source === "string") {
    return source;
  }
  if (source && typeof source === "object" && "source" in source) {
    const sourceValue = (source as { source?: unknown }).source;
    if (typeof sourceValue === "string") return sourceValue;
  }
  return undefined;
}

function toFreshnessIso(freshnessSeconds: unknown): string | undefined {
  if (typeof freshnessSeconds !== "number" || !Number.isFinite(freshnessSeconds)) {
    return undefined;
  }
  const ts = Date.now() - Math.max(0, Math.floor(freshnessSeconds * 1000));
  return new Date(ts).toISOString();
}

function normalizeHealth(payload: BackendHealth | undefined): HealthStatus {
  const llmMode = typeof payload?.llm_mode === "string" ? payload.llm_mode.toLowerCase() : "unknown";
  return {
    api: payload?.api === "ok" ? "ok" : payload?.api === "error" ? "error" : "mock",
    redis: payload?.exact_cache ? "ok" : "unknown",
    chromadb: payload?.semantic_cache ? "ok" : "unknown",
    llm_mode: llmMode === "mock" ? "mock" : "real",
    sample_data_loaded: Boolean(payload?.sample_data_loaded),
    market_price_count: typeof payload?.market_price_count === "number" ? payload.market_price_count : 0,
    exact_cache: payload?.exact_cache,
    semantic_cache: payload?.semantic_cache,
  };
}
