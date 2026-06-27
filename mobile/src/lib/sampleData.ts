import type {
  CacheMetrics,
  DealFeedParams,
  DealFeedResponse,
  DealRecord,
  HealthStatus,
} from '@/src/lib/api';

export const sampleDeals: DealRecord[] = [
  {
    id: 'deal_01',
    cache: 'miss',
    item: {
      product_name: 'Samsung Galaxy S23 Ultra',
      brand: 'Samsung',
      model: 'Galaxy S23 Ultra',
      condition: 'used_good',
      asking_price: 9000000,
      sold_status: false,
      confidence: 0.91,
    },
    deal: {
      market_price: 15000000,
      discount_pct: 40,
      verdict: 'HOT_DEAL',
    },
    raw_post: 'Pass ss s23 ultra 9tr, xuoc dam nhe, gia hat de.',
    source: 'sample_fallback',
    updated_at: 'Sample data',
    freshness: 'Sample fallback',
    trace: ['redis_miss', 'semantic_miss', 'mock_llm', 'scored', 'stored'],
  },
  {
    id: 'deal_02',
    cache: 'redis_hit',
    item: {
      product_name: 'iPhone 14 Pro 128GB',
      brand: 'Apple',
      model: 'iPhone 14 Pro',
      condition: 'used_good',
      asking_price: 14500000,
      sold_status: false,
      confidence: 0.88,
    },
    deal: {
      market_price: 17000000,
      discount_pct: 15,
      verdict: 'OK_DEAL',
    },
    raw_post: 'Can ban iPhone 14 Pro 128gb tim, pin 88, may dep, 14tr5.',
    source: 'sample_fallback',
    updated_at: 'Sample data',
    freshness: 'Redis sample',
    trace: ['redis_hit', 'returned_cached_analysis'],
  },
  {
    id: 'deal_03',
    cache: 'semantic_hit',
    item: {
      product_name: 'Sony WH-1000XM5',
      brand: 'Sony',
      model: 'WH-1000XM5',
      condition: 'used_like_new',
      asking_price: 3900000,
      sold_status: false,
      confidence: 0.84,
    },
    deal: {
      market_price: 5900000,
      discount_pct: 34,
      verdict: 'OK_DEAL',
    },
    raw_post: 'Sony xm5 fullbox, it dung, ban nhanh 3tr9.',
    source: 'sample_fallback',
    updated_at: 'Sample data',
    freshness: 'Semantic sample',
    trace: ['redis_miss', 'semantic_hit', 'reused_prior_analysis'],
  },
  {
    id: 'deal_04',
    cache: 'miss',
    item: {
      product_name: 'Nintendo Switch OLED',
      brand: 'Nintendo',
      model: 'Switch OLED',
      condition: 'used_fair',
      asking_price: 6600000,
      sold_status: false,
      confidence: 0.79,
    },
    deal: {
      market_price: 6500000,
      discount_pct: -2,
      verdict: 'IGNORE',
    },
    raw_post: 'Switch OLED may cu, joycon hoi drift nhe, 6tr6.',
    source: 'sample_fallback',
    updated_at: 'Sample data',
    freshness: 'Sample fallback',
    trace: ['redis_miss', 'semantic_miss', 'mock_llm', 'scored', 'ignored'],
  },
  {
    id: 'deal_05',
    cache: 'semantic_hit',
    item: {
      product_name: 'MacBook Air M2 13 inch',
      brand: 'Apple',
      model: 'MacBook Air M2',
      condition: 'used_good',
      asking_price: 16500000,
      sold_status: false,
      confidence: 0.86,
    },
    deal: {
      market_price: 23000000,
      discount_pct: 28,
      verdict: 'OK_DEAL',
    },
    raw_post: 'Mac air m2 8/256, sac 82 lan, ngoai hinh 97%, 16tr5.',
    source: 'sample_fallback',
    updated_at: 'Sample data',
    freshness: 'Semantic sample',
    trace: ['redis_miss', 'semantic_hit', 'scored'],
  },
  {
    id: 'deal_06',
    cache: 'redis_hit',
    item: {
      product_name: 'Fujifilm X100V',
      brand: 'Fujifilm',
      model: 'X100V',
      condition: 'used_good',
      asking_price: 25000000,
      sold_status: false,
      confidence: 0.9,
    },
    deal: {
      market_price: 33000000,
      discount_pct: 24,
      verdict: 'OK_DEAL',
    },
    raw_post: 'Fuji x100v bac, ngoai hinh dep, fullbox, 25tr.',
    source: 'sample_fallback',
    updated_at: 'Sample data',
    freshness: 'Redis sample',
    trace: ['redis_hit', 'returned_cached_analysis'],
  },
];

export const sampleMetrics: CacheMetrics = {
  exact_cache_hits: 31,
  semantic_cache_hits: 17,
  llm_calls_avoided: 48,
  llm_calls_made: 12,
  estimated_cost_saved: 1.92,
  cache_hit_rate: 0.8,
};

export const sampleHealth: HealthStatus = {
  api: 'sample_fallback',
  redis: 'sample_fallback',
  chromadb: 'sample_fallback',
  llm_mode: 'mock',
  mock_mode: true,
  sample_data_loaded: true,
};

export function getSampleDeals(params: DealFeedParams = {}): DealFeedResponse {
  const limit = params.limit ?? 25;
  const start = params.cursor ? Number(params.cursor) : 0;
  const q = params.q?.trim().toLowerCase();

  const filtered = sampleDeals.filter((deal) => {
    const verdictMatches = !params.verdict || params.verdict === 'ALL' || deal.deal.verdict === params.verdict;
    const queryMatches =
      !q ||
      [deal.item.product_name, deal.item.brand, deal.item.model, deal.raw_post]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(q));

    return verdictMatches && queryMatches;
  });

  const items = filtered.slice(start, start + limit);
  const nextIndex = start + limit;

  return {
    items,
    next_cursor: nextIndex < filtered.length ? String(nextIndex) : null,
  };
}

export function getSampleDeal(id: string) {
  const deal = sampleDeals.find((item) => item.id === id);

  if (!deal) {
    throw new Error(`Sample deal not found: ${id}`);
  }

  return deal;
}
