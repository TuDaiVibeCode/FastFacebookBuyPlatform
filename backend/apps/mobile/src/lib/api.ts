import type { CacheMetrics, DealRecord, DealsResponse, HealthResponse, Verdict } from './types';

const DEFAULT_API_BASE_URL = 'http://localhost:18000';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL
).replace(/\/$/, '');

type ApiErrorBody = {
  detail?: string;
  message?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = undefined;
    }
    throw new ApiError(body?.detail || body?.message || `Request failed with ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}

function normalizeDealsResponse(payload: DealRecord[] | DealsResponse): DealsResponse {
  if (Array.isArray(payload)) {
    return { items: payload };
  }

  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    next_cursor: payload.next_cursor ?? null,
  };
}

export async function getDeals(params: { verdict?: Verdict; limit?: number } = {}): Promise<DealsResponse> {
  const search = new URLSearchParams();

  if (params.verdict) {
    search.set('verdict', params.verdict);
  }
  search.set('limit', String(params.limit ?? 50));

  const query = search.toString();
  const payload = await fetchJson<DealRecord[] | DealsResponse>(`/api/v1/deals${query ? `?${query}` : ''}`);
  return normalizeDealsResponse(payload);
}

export function getDeal(id: string): Promise<DealRecord> {
  return fetchJson<DealRecord>(`/api/v1/deals/${encodeURIComponent(id)}`);
}

export function getCacheMetrics(): Promise<CacheMetrics> {
  return fetchJson<CacheMetrics>('/api/v1/metrics/cache');
}

export function getHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>('/api/v1/health');
}
