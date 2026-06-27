export type CacheState = "miss" | "redis_hit" | "semantic_hit";

export type Verdict = "HOT_DEAL" | "OK_DEAL" | "IGNORE";

export type NormalizedItem = {
  product_name: string;
  brand?: string;
  model?: string;
  condition: string;
  asking_price: number | null;
  currency?: string;
  sold_status: boolean;
  location?: string | null;
  confidence: number;
  raw_text_hash?: string;
};

export type DealScore = {
  market_price: number | null;
  discount_pct: number | null;
  verdict: Verdict;
};

export type DealRecord = {
  id: string;
  cache: CacheState;
  item: NormalizedItem;
  deal: DealScore;
  raw_post?: string;
  source?: string;
  freshness?: string;
  trace?: string[];
  processing_ms?: number;
  created_at?: string;
  updated_at?: string;
};

export type AnalyzeRequest = {
  text: string;
  source?: "sample" | "manual" | "approved";
};

export type AnalyzeResponse = DealRecord;

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

export type DealsResponse = {
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
  api: "ok" | "error" | "mock";
  redis: "ok" | "error" | "unknown";
  chromadb: "ok" | "error" | "unknown";
  llm_mode: "mock" | "real" | "unknown";
  sample_data_loaded: boolean;
  market_price_count?: number;
  exact_cache?: string;
  semantic_cache?: string;
};
