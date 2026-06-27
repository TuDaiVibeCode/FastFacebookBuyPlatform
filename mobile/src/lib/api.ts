export type CacheState = 'miss' | 'redis_hit' | 'semantic_hit';
export type DealVerdict = 'HOT_DEAL' | 'OK_DEAL' | 'IGNORE';

export type NormalizedItem = {
  product_name: string;
  brand?: string;
  model?: string;
  condition?: string;
  asking_price: number;
  sold_status?: boolean;
  confidence?: number;
};

export type DealScore = {
  market_price: number;
  discount_pct: number;
  verdict: DealVerdict;
};

export type DealRecord = {
  id: string;
  cache: CacheState;
  item: NormalizedItem;
  deal: DealScore;
  trace?: string[];
  raw_post?: string;
  source?: string;
  created_at?: string;
  updated_at?: string;
  freshness?: string;
};

export type DealFeedResponse = {
  items: DealRecord[];
  next_cursor?: string | null;
};

export type CacheMetrics = {
  exact_cache_hits: number;
  semantic_cache_hits: number;
  llm_calls_avoided: number;
  llm_calls_made: number;
  estimated_cost_saved: number;
  cache_hit_rate: number;
};

export type HealthStatus = {
  api?: string | boolean;
  redis?: string | boolean;
  valkey?: string | boolean;
  chroma?: string | boolean;
  chromadb?: string | boolean;
  llm_mode?: string;
  mock_mode?: boolean;
  sample_data_loaded?: boolean;
  [key: string]: string | number | boolean | null | undefined;
};

export type DealFeedParams = {
  verdict?: DealVerdict | 'ALL';
  q?: string;
  limit?: number;
  cursor?: string;
};

const DEFAULT_API_BASE_URL = 'http://localhost:18000';
const USE_SAMPLE_FALLBACK = process.env.EXPO_PUBLIC_USE_SAMPLE_FALLBACK !== '0';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? DEFAULT_API_BASE_URL;

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status}: ${body || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function normalizeDealFeed(payload: DealRecord[] | DealFeedResponse): DealFeedResponse {
  if (Array.isArray(payload)) {
    return { items: payload, next_cursor: null };
  }

  return {
    items: payload.items ?? [],
    next_cursor: payload.next_cursor ?? null,
  };
}

export async function getDeals(params: DealFeedParams = {}): Promise<DealFeedResponse> {
  const { getSampleDeals } = await import('@/src/lib/sampleData');
  const search = new URLSearchParams();

  if (params.verdict && params.verdict !== 'ALL') {
    search.set('verdict', params.verdict);
  }

  if (params.q) {
    search.set('q', params.q);
  }

  if (params.limit) {
    search.set('limit', String(params.limit));
  }

  if (params.cursor) {
    search.set('cursor', params.cursor);
  }

  try {
    const query = search.toString();
    const payload = await fetchJson<DealRecord[] | DealFeedResponse>(
      `/api/v1/deals${query ? `?${query}` : ''}`
    );

    return normalizeDealFeed(payload);
  } catch (error) {
    if (!USE_SAMPLE_FALLBACK) {
      throw error;
    }

    return getSampleDeals(params);
  }
}

export async function getDeal(id: string): Promise<DealRecord> {
  const { getSampleDeal } = await import('@/src/lib/sampleData');

  try {
    return await fetchJson<DealRecord>(`/api/v1/deals/${encodeURIComponent(id)}`);
  } catch (error) {
    if (!USE_SAMPLE_FALLBACK) {
      throw error;
    }

    return getSampleDeal(id);
  }
}

export async function getCacheMetrics(): Promise<CacheMetrics> {
  const { sampleMetrics } = await import('@/src/lib/sampleData');

  try {
    return await fetchJson<CacheMetrics>('/api/v1/metrics/cache');
  } catch (error) {
    if (!USE_SAMPLE_FALLBACK) {
      throw error;
    }

    return sampleMetrics;
  }
}

export async function getHealth(): Promise<HealthStatus> {
  const { sampleHealth } = await import('@/src/lib/sampleData');

  try {
    return await fetchJson<HealthStatus>('/api/v1/health');
  } catch (error) {
    if (!USE_SAMPLE_FALLBACK) {
      throw error;
    }

    return sampleHealth;
  }
}

export function formatVnd(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'n/a';
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}
