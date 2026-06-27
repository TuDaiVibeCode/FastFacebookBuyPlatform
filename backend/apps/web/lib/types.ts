export type CacheState = "miss" | "redis_hit" | "semantic_hit";

export type Verdict = "HOT_DEAL" | "OK_DEAL" | "IGNORE";

export type AnalyzeRequest = {
  text: string;
  source?: string;
  source_url?: string;
};

export type NormalizedItem = {
  product_name: string;
  brand?: string | null;
  model?: string | null;
  condition?: string | null;
  asking_price?: number | null;
  currency?: string | null;
  sold_status?: boolean | null;
  location?: string | null;
  confidence?: number | null;
  raw_text_hash?: string | null;
};

export type DealScore = {
  market_price?: number | null;
  discount_pct?: number | null;
  verdict: Verdict;
};

export type DealRecord = {
  id: string;
  raw_text?: string | null;
  source?: string | null;
  source_url?: string | null;
  item: NormalizedItem;
  deal: DealScore;
  cache: CacheState;
  trace?: string[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type AnalyzeResponse = DealRecord;

export type DealsResponse =
  | DealRecord[]
  | {
      items?: DealRecord[];
      deals?: DealRecord[];
      results?: DealRecord[];
      next_cursor?: string | null;
    };

export type CacheMetrics = {
  exact_cache_hits?: number;
  redis_hits?: number;
  semantic_cache_hits?: number;
  llm_calls_avoided?: number;
  llm_calls_made?: number;
  estimated_cost_saved?: number;
  cache_hit_rate?: number;
};

export type HealthStatus = {
  api?: string;
  redis?: string;
  valkey?: string;
  chromadb?: string;
  llm_mode?: string;
  sample_data_loaded?: boolean;
  status?: string;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; data: T; error: string };
