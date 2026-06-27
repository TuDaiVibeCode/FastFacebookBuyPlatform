import AsyncStorage from '@react-native-async-storage/async-storage';

export type CacheState = 'miss' | 'redis_hit' | 'semantic_hit';
export type DealVerdict = 'HOT_DEAL' | 'OK_DEAL' | 'IGNORE';

export type NormalizedItem = {
  product_name: string;
  brand?: string;
  model?: string;
  condition?: string;
  asking_price: number | null;
  sold_status?: boolean;
  confidence?: number;
  location?: string | null;
};

export type DealScore = {
  market_price: number | null;
  discount_pct: number | null;
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

export type AnalyzeRequest = {
  text: string;
  source?: "sample" | "manual" | "approved";
  source_url?: string;
};

export type AuthRequest = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: string;
  email: string;
  created_at: string;
};

export type AuthTokenResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

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
  };
  deal?: {
    market_price?: number | null;
    discount_pct?: number | null;
    verdict?: string;
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
};

type BackendDealCard = BackendPayload;
type BackendAnalyzeLike = BackendPayload;

type BackendDealFeedResponse = {
  items?: BackendDealCard[];
  next_cursor?: string | null;
};

export type DealFeedParams = {
  verdict?: DealVerdict | 'ALL';
  q?: string;
  limit?: number;
  cursor?: string;
};

const DEFAULT_API_BASE_URL = 'http://localhost:18000';
const USE_SAMPLE_FALLBACK = process.env.EXPO_PUBLIC_USE_SAMPLE_FALLBACK === "1";
const AUTH_TOKEN_KEY = process.env.EXPO_PUBLIC_AUTH_TOKEN_KEY ?? 'deal-radar-auth-token';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? DEFAULT_API_BASE_URL;

export async function getStoredAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function setStoredAuthToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    return;
  }

  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
}

type FetchInit = RequestInit & {
  auth?: boolean;
};

async function fetchJson<T>(path: string, init: FetchInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');

  if (init.auth !== false) {
    const token = await getStoredAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status}: ${body || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function normalizeDeals(payload: BackendDealFeedResponse | BackendDealCard[]): DealFeedResponse {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : [];

  return {
    items: items.map(normalizeDealRecord),
    next_cursor: Array.isArray(payload) ? null : payload?.next_cursor ?? null,
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
    const payload = await fetchJson<BackendDealFeedResponse | BackendDealCard[]>(
      `/api/v1/deals${query ? `?${query}` : ''}`
    );

    return normalizeDeals(payload);
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
    const payload = await fetchJson<BackendAnalyzeLike>(`/api/v1/deals/${encodeURIComponent(id)}`);
    return normalizeDealRecord(payload);
  } catch (error) {
    if (!USE_SAMPLE_FALLBACK) {
      throw error;
    }

    return getSampleDeal(id);
  }
}

export async function analyzeDeal(payload: AnalyzeRequest): Promise<DealRecord> {
  try {
    const response = await fetchJson<BackendAnalyzeLike>('/api/v1/deals/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: payload.text.trim(),
        source: payload.source ?? 'manual',
        ...(payload.source_url ? { source_url: payload.source_url } : {}),
      }),
    });

    return normalizeDealRecord(response);
  } catch (error) {
    if (!USE_SAMPLE_FALLBACK) {
      throw error;
    }

    return buildFallbackAnalysis(payload);
  }
}

export async function registerUser(payload: AuthRequest): Promise<AuthTokenResponse> {
  const response = await fetchJson<AuthTokenResponse>('/api/v1/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    auth: false,
  });
  await setStoredAuthToken(response.access_token);
  return response;
}

export async function loginUser(payload: AuthRequest): Promise<AuthTokenResponse> {
  const response = await fetchJson<AuthTokenResponse>('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    auth: false,
  });
  await setStoredAuthToken(response.access_token);
  return response;
}

export async function getCurrentUser(): Promise<AuthUser> {
  return fetchJson<AuthUser>('/api/v1/auth/me');
}

async function buildFallbackAnalysis(payload: AnalyzeRequest): Promise<DealRecord> {
  const { getSampleDeals } = await import('@/src/lib/sampleData');
  const sample = getSampleDeals().items[0];
  const now = new Date().toISOString();

  if (!sample) {
    throw new Error('No sample data available');
  }

  return {
    ...sample,
    id: `sample-${Date.now()}`,
    raw_post: payload.text,
    source: 'sample_fallback',
    freshness: now,
    created_at: now,
    updated_at: now,
  };
}

export function formatVnd(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'n/a';
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeDealRecord(payload: BackendAnalyzeLike | BackendDealCard): DealRecord {
  const traceRaw = Array.isArray(payload?.trace) ? payload.trace : [];
  const trace = traceRaw.filter((step): step is string => typeof step === "string");
  const verdict = parseVerdict(payload.deal?.verdict ?? payload.verdict);
  const cache = parseCache(payload.cache);
  const productName = payload.item?.product_name ?? payload.product_name ?? "Unknown listing";
  const askingPrice = pickNumber(payload.item?.asking_price ?? payload.asking_price);
  const marketPrice = pickNumber(payload.deal?.market_price ?? payload.market_price);
  const discountPct = pickNumber(payload.deal?.discount_pct ?? payload.discount_pct, true);
  const rawPost = typeof payload.raw_post === "string"
    ? payload.raw_post
    : typeof payload.raw_text === "string"
      ? payload.raw_text
      : undefined;

  return {
    id: typeof payload.id === "string" ? payload.id : `deal-${Date.now()}`,
    cache,
    item: {
      product_name: productName,
      brand: payload.item?.brand ?? undefined,
      model: payload.item?.model ?? undefined,
      condition: payload.item?.condition ?? 'unknown',
      asking_price: askingPrice,
      sold_status: Boolean(payload.item?.sold_status),
      confidence: typeof payload.item?.confidence === 'number' ? payload.item.confidence : 0,
      location: payload.item?.location ?? undefined,
    },
    deal: {
      market_price: marketPrice,
      discount_pct: discountPct,
      verdict,
    },
    trace,
    raw_post: rawPost,
    source: resolveSource(payload.source),
    created_at: payload.created_at || undefined,
    updated_at: payload.updated_at || undefined,
    freshness: payload.freshness || toFreshnessIso(payload.freshness_seconds),
    // processing_ms is intentionally not part of the public mobile type.
  };
}

function parseCache(value: unknown): DealRecord["cache"] {
  if (value === "redis_hit" || value === "semantic_hit" || value === "miss") {
    return value;
  }
  return "miss";
}

function parseVerdict(value: unknown): DealVerdict {
  if (value === 'HOT_DEAL' || value === 'OK_DEAL' || value === 'IGNORE') {
    return value;
  }

  return 'IGNORE';
}

function pickNumber(value: unknown, allowFloat = false): number | null {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return null;
  }
  if (allowFloat) {
    return value;
  }
  return Math.trunc(value);
}

function resolveSource(source: unknown): string | undefined {
  if (typeof source === 'string') {
    return source;
  }
  if (source && typeof source === 'object' && 'source' in source) {
    const sourceValue = (source as { source?: unknown }).source;
    return typeof sourceValue === 'string' ? sourceValue : undefined;
  }

  return undefined;
}

function toFreshnessIso(freshnessSeconds: unknown): string | undefined {
  if (typeof freshnessSeconds !== 'number' || !Number.isFinite(freshnessSeconds)) {
    return undefined;
  }
  const ts = Date.now() - Math.max(0, Math.floor(freshnessSeconds * 1000));
  return new Date(ts).toISOString();
}
