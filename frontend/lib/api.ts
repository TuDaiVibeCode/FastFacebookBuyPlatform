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

const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:18000";

type FetchOptions = {
  revalidate?: number;
  tags?: string[];
};

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

  return fetchJson<DealsResponse | DealRecord[]>(`/api/v1/deals${suffix}`, {
    revalidate: 30,
    tags: [CACHE_TAGS.deals],
  })
    .then((data) => (Array.isArray(data) ? { items: data, next_cursor: null } : data))
    .catch(() => fallback);
}

export async function getDeal(id: string): Promise<DealRecord | null> {
  return fetchJson<DealRecord>(`/api/v1/deals/${id}`, {
    revalidate: 300,
    tags: [CACHE_TAGS.deal(id)],
  }).catch(() => getMockDeal(id));
}

export async function getCacheMetrics(): Promise<CacheMetrics> {
  return fetchJson<CacheMetrics>("/api/v1/cache/metrics", {
    revalidate: 30,
    tags: [CACHE_TAGS.deals],
  }).catch(() => getMockMetrics());
}

export async function getHealth(): Promise<HealthStatus> {
  return fetchJson<HealthStatus>("/api/v1/health", {
    revalidate: 15,
    tags: [CACHE_TAGS.deals],
  }).catch(() => mockHealth);
}

async function fetchJson<T>(path: string, options: FetchOptions): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: options.revalidate,
      tags: options.tags,
    },
  });

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
