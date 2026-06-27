export const CACHE_TAGS = {
  deals: "deals",
  marketPrices: "market-prices",
  deal: (id: string) => `deal:${id}`,
} as const;
