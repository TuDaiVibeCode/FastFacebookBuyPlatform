from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class CacheSource(StrEnum):
    miss = "miss"
    redis_hit = "redis_hit"
    semantic_hit = "semantic_hit"


class Verdict(StrEnum):
    hot_deal = "HOT_DEAL"
    ok_deal = "OK_DEAL"
    ignore = "IGNORE"


class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=1)
    source: str = "sample"
    source_url: str | None = None


class NormalizedItem(BaseModel):
    product_name: str | None
    brand: str | None
    model: str | None
    condition: str = "unknown"
    asking_price: int | None
    currency: str = "VND"
    sold_status: bool = False
    location: str | None = None
    confidence: float = 0.0
    raw_text_hash: str


class DealScore(BaseModel):
    market_price: int | None
    discount_pct: float | None
    verdict: Verdict


class SourceMetadata(BaseModel):
    source: str
    source_url: str | None = None
    policy_status: str


class AnalyzeResponse(BaseModel):
    id: str
    cache: CacheSource
    item: NormalizedItem
    deal: DealScore
    trace: list[str]
    raw_text: str
    source: SourceMetadata
    created_at: datetime
    updated_at: datetime


class DealCard(BaseModel):
    id: str
    product_name: str | None
    asking_price: int | None
    market_price: int | None
    discount_pct: float | None
    verdict: Verdict
    cache: CacheSource
    freshness_seconds: int
    created_at: datetime


class DealFeedResponse(BaseModel):
    items: list[DealCard]
    next_cursor: str | None = None


class HealthResponse(BaseModel):
    api: str
    exact_cache: str
    semantic_cache: str
    llm_mode: str
    sample_data_loaded: bool
    market_price_count: int


class CacheMetrics(BaseModel):
    total_analyze_requests: int
    exact_cache_hits: int
    semantic_cache_hits: int
    llm_calls_avoided: int
    llm_calls_made: int
    estimated_cost_saved: float
    cache_hit_rate: float


class ListingBoundary(BaseModel):
    product_name: str | None
    asking_price: int | None
    currency: str = "VND"
    source: str
    source_url: str | None = None
    freshness_at: datetime
    dedupe_hash: str
    confidence: float
    location: str | None = None
    geo_point: dict[str, float] | None = None
    search_text: str
    extra: dict[str, Any] = Field(default_factory=dict)


class User(BaseModel):
    id: str
    email: str
    created_at: datetime


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=1)


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User
