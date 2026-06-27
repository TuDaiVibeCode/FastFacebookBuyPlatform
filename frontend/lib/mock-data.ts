import type {
  AnalyzeRequest,
  AnalyzeResponse,
  CacheMetrics,
  DealScore,
  DealsResponse,
  DealRecord,
  HealthStatus,
} from "@/lib/types";

type MockStore = {
  exactCache: Map<string, AnalyzeResponse>;
  semanticProducts: Map<string, AnalyzeResponse>;
  recentDeals: DealRecord[];
  metricState: CacheMetrics;
  sequence: number;
};

declare global {
  var __dealRadarMockStore: MockStore | undefined;
}

const now = new Date("2026-06-27T04:00:00.000Z").toISOString();

export const samplePosts = [
  "pass ss s23 ultra 9tr xuoc dam nhe, gia hat de",
  "can bay samsung s23u 9 trieu, may con ngon, ai lay ib",
  "pass mac m1 pin trau, fix nhe cho ae thien chi",
] as const;

export const mockDeals: DealRecord[] = [
  {
    id: "deal_01",
    cache: "miss",
    source: "sample",
    freshness: now,
    raw_post: samplePosts[0],
    processing_ms: 842,
    item: {
      product_name: "Samsung Galaxy S23 Ultra",
      brand: "Samsung",
      model: "Galaxy S23 Ultra",
      condition: "used_good",
      asking_price: 9000000,
      currency: "VND",
      sold_status: false,
      location: "Ho Chi Minh City",
      confidence: 0.91,
      raw_text_hash: "sample_hash_01",
    },
    deal: {
      market_price: 15000000,
      discount_pct: 40,
      verdict: "HOT_DEAL",
    },
    trace: ["redis_miss", "semantic_miss", "mock_llm", "scored", "stored"],
  },
  {
    id: "deal_02",
    cache: "redis_hit",
    source: "sample",
    freshness: now,
    raw_post: samplePosts[0],
    processing_ms: 37,
    item: {
      product_name: "Samsung Galaxy S23 Ultra",
      brand: "Samsung",
      model: "Galaxy S23 Ultra",
      condition: "used_good",
      asking_price: 9000000,
      currency: "VND",
      sold_status: false,
      location: "Ho Chi Minh City",
      confidence: 0.91,
      raw_text_hash: "sample_hash_01",
    },
    deal: {
      market_price: 15000000,
      discount_pct: 40,
      verdict: "HOT_DEAL",
    },
    trace: ["redis_hit", "returned_cached_response"],
  },
  {
    id: "deal_03",
    cache: "semantic_hit",
    source: "sample",
    freshness: now,
    raw_post: samplePosts[1],
    processing_ms: 126,
    item: {
      product_name: "Samsung Galaxy S23 Ultra",
      brand: "Samsung",
      model: "Galaxy S23 Ultra",
      condition: "used_good",
      asking_price: 9000000,
      currency: "VND",
      sold_status: false,
      location: "Ho Chi Minh City",
      confidence: 0.88,
      raw_text_hash: "sample_hash_02",
    },
    deal: {
      market_price: 15000000,
      discount_pct: 40,
      verdict: "HOT_DEAL",
    },
    trace: ["redis_miss", "semantic_hit", "recomputed_score", "stored"],
  },
  {
    id: "deal_04",
    cache: "miss",
    source: "sample",
    freshness: now,
    raw_post: samplePosts[2],
    processing_ms: 793,
    item: {
      product_name: "MacBook Air M1",
      brand: "Apple",
      model: "MacBook Air M1",
      condition: "used_good",
      asking_price: 11500000,
      currency: "VND",
      sold_status: false,
      location: "Da Nang",
      confidence: 0.86,
      raw_text_hash: "sample_hash_03",
    },
    deal: {
      market_price: 14000000,
      discount_pct: 18,
      verdict: "IGNORE",
    },
    trace: ["redis_miss", "semantic_miss", "mock_llm", "scored", "stored"],
  },
];

export const mockMetrics: CacheMetrics = {
  exact_cache_hits: 18,
  semantic_cache_hits: 9,
  llm_calls_avoided: 27,
  llm_calls_made: 14,
  estimated_cost_saved: 1.36,
  cache_hit_rate: 0.66,
};

export const mockHealth: HealthStatus = {
  api: "mock",
  redis: "unknown",
  chromadb: "unknown",
  llm_mode: "mock",
  sample_data_loaded: true,
};

const store =
  globalThis.__dealRadarMockStore ??
  (globalThis.__dealRadarMockStore = {
    exactCache: new Map<string, AnalyzeResponse>(),
    semanticProducts: new Map<string, AnalyzeResponse>(),
    recentDeals: [],
    metricState: { ...mockMetrics },
    sequence: 100,
  });

export function getMockDeals(verdict?: string | null): DealsResponse {
  const allDeals = [...store.recentDeals, ...mockDeals];
  const items =
    verdict && verdict !== "ALL"
      ? allDeals.filter((deal) => deal.deal.verdict === verdict)
      : allDeals;

  return { items, next_cursor: null };
}

export function getMockDeal(id: string): DealRecord | null {
  return [...store.recentDeals, ...mockDeals].find((deal) => deal.id === id) ?? null;
}

export function getMockMetrics(): CacheMetrics {
  return { ...store.metricState };
}

export function analyzeWithMockCache(request: AnalyzeRequest): AnalyzeResponse {
  const normalizedText = normalizePostText(request.text);
  const productKey = inferProductKey(normalizedText);
  const existingExact = store.exactCache.get(normalizedText);

  if (existingExact) {
    const redisHit: AnalyzeResponse = {
      ...existingExact,
      id: `deal_${store.sequence++}`,
      cache: "redis_hit",
      processing_ms: 31,
      trace: ["redis_hit", "returned_cached_response"],
      freshness: new Date().toISOString(),
    };
    recordCacheOutcome("redis_hit");
    rememberRecentDeal(redisHit);
    return redisHit;
  }

  const semanticMatch = store.semanticProducts.get(productKey);
  const response = buildMockAnalyzeResponse(request, normalizedText, productKey);

  if (semanticMatch) {
    const semanticResponse: AnalyzeResponse = {
      ...response,
      cache: "semantic_hit",
      item: {
        ...semanticMatch.item,
        asking_price: response.item.asking_price,
        raw_text_hash: response.item.raw_text_hash,
      },
      deal: scoreDeal(response.item.asking_price, semanticMatch.deal.market_price),
      processing_ms: 119,
      trace: ["redis_miss", "semantic_hit", "recomputed_score", "stored"],
    };
    store.exactCache.set(normalizedText, semanticResponse);
    recordCacheOutcome("semantic_hit");
    rememberRecentDeal(semanticResponse);
    return semanticResponse;
  }

  store.exactCache.set(normalizedText, response);
  store.semanticProducts.set(productKey, response);
  recordCacheOutcome("miss");
  rememberRecentDeal(response);
  return response;
}

function recordCacheOutcome(cache: AnalyzeResponse["cache"]) {
  if (cache === "redis_hit") {
    store.metricState.exact_cache_hits += 1;
    store.metricState.llm_calls_avoided += 1;
  } else if (cache === "semantic_hit") {
    store.metricState.semantic_cache_hits += 1;
    store.metricState.llm_calls_avoided += 1;
  } else {
    store.metricState.llm_calls_made += 1;
  }

  const total = store.metricState.llm_calls_avoided + store.metricState.llm_calls_made;
  store.metricState.cache_hit_rate =
    total > 0 ? store.metricState.llm_calls_avoided / total : 0;
  store.metricState.estimated_cost_saved = Number(
    (store.metricState.llm_calls_avoided * 0.05).toFixed(2),
  );
}

function rememberRecentDeal(deal: DealRecord) {
  store.recentDeals.unshift(deal);
  if (store.recentDeals.length > 12) {
    store.recentDeals.pop();
  }
}

function buildMockAnalyzeResponse(
  request: AnalyzeRequest,
  normalizedText: string,
  productKey: string,
): AnalyzeResponse {
  const product = inferProduct(productKey);
  const askingPrice = inferPrice(normalizedText, product.defaultPrice);
  const deal = scoreDeal(askingPrice, product.marketPrice);

  return {
    id: `deal_${store.sequence++}`,
    cache: "miss",
    source: request.source ?? "sample",
    freshness: new Date().toISOString(),
    raw_post: request.text,
    processing_ms: 824,
    item: {
      product_name: product.productName,
      brand: product.brand,
      model: product.model,
      condition: normalizedText.includes("xuoc") ? "used_fair" : "used_good",
      asking_price: askingPrice,
      currency: "VND",
      sold_status: normalizedText.includes("sold") || normalizedText.includes("da ban"),
      location: "Ho Chi Minh City",
      confidence: 0.89,
      raw_text_hash: hashLike(normalizedText),
    },
    deal,
    trace: ["redis_miss", "semantic_miss", "mock_llm", "scored", "stored"],
  };
}

function scoreDeal(askingPrice: number | null, marketPrice: number | null): DealScore {
  if (!askingPrice || !marketPrice) {
    return { market_price: marketPrice, discount_pct: null, verdict: "IGNORE" as const };
  }

  const discount = Math.round(((marketPrice - askingPrice) / marketPrice) * 100);
  const verdict: DealScore["verdict"] =
    discount >= 40 ? "HOT_DEAL" : discount >= 20 ? "OK_DEAL" : "IGNORE";

  return {
    market_price: marketPrice,
    discount_pct: discount,
    verdict,
  };
}

function inferProductKey(text: string) {
  const words = text.split(/[^a-z0-9]+/).filter(Boolean);
  const hasWord = (word: string) => words.includes(word);

  if (hasWord("s23") || hasWord("s23u") || hasWord("samsung") || hasWord("ss")) {
    return "samsung-s23-ultra";
  }
  if (hasWord("iphone") || hasWord("ip13")) {
    return "iphone-13-pro";
  }
  if (hasWord("mac") || hasWord("m1")) {
    return "macbook-air-m1";
  }
  if (hasWord("airpod") || hasWord("airpods")) {
    return "airpods-pro-2";
  }
  return "unknown-product";
}

function inferProduct(productKey: string) {
  switch (productKey) {
    case "samsung-s23-ultra":
      return {
        productName: "Samsung Galaxy S23 Ultra",
        brand: "Samsung",
        model: "Galaxy S23 Ultra",
        marketPrice: 15000000,
        defaultPrice: 9000000,
      };
    case "iphone-13-pro":
      return {
        productName: "iPhone 13 Pro",
        brand: "Apple",
        model: "iPhone 13 Pro",
        marketPrice: 13000000,
        defaultPrice: 10000000,
      };
    case "macbook-air-m1":
      return {
        productName: "MacBook Air M1",
        brand: "Apple",
        model: "MacBook Air M1",
        marketPrice: 14000000,
        defaultPrice: 11500000,
      };
    case "airpods-pro-2":
      return {
        productName: "AirPods Pro 2",
        brand: "Apple",
        model: "AirPods Pro 2",
        marketPrice: 3500000,
        defaultPrice: 2500000,
      };
    default:
      return {
        productName: "Unknown resale item",
        brand: "Unknown",
        model: "Unknown",
        marketPrice: null,
        defaultPrice: null,
      };
  }
}

function inferPrice(text: string, fallback: number | null) {
  const trieuMatch = text.match(/(?:^|[\s,;:])(\d+(?:[.,]\d+)?)\s*(?:tr|trieu)\b/);
  if (trieuMatch?.[1]) {
    return Math.round(Number(trieuMatch[1].replace(",", ".")) * 1000000);
  }

  const millionMatch = text.match(/(?:^|[\s,;:])(\d+(?:[.,]\d+)?)\s*m\b/);
  if (millionMatch?.[1]) {
    return Math.round(Number(millionMatch[1].replace(",", ".")) * 1000000);
  }

  return fallback;
}

function normalizePostText(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function hashLike(text: string) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return `mock_${hash.toString(16)}`;
}
