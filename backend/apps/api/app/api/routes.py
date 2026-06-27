from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.application import AnalyzePipeline
from app.core.config import Settings
from app.shared.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    CacheMetrics,
    DealFeedResponse,
    HealthResponse,
    Verdict,
)


def build_api_router(pipeline: AnalyzePipeline, settings: Settings) -> APIRouter:
    router = APIRouter(prefix="/api/v1")

    @router.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(
            api="ok",
            exact_cache=pipeline.exact_cache.backend_name,
            semantic_cache=pipeline.semantic_cache.collection_name,
            llm_mode="mock" if settings.use_mock_llm else "real",
            sample_data_loaded=pipeline.pricing.ready(),
            market_price_count=pipeline.pricing.count(),
        )

    @router.post("/deals/analyze", response_model=AnalyzeResponse, status_code=201)
    def analyze_deal(request: AnalyzeRequest) -> AnalyzeResponse:
        return pipeline.analyze(request)

    @router.get("/deals", response_model=DealFeedResponse)
    def list_deals(
        verdict: Verdict | None = None,
        q: str | None = None,
        limit: int = Query(default=20, ge=1, le=100),
        cursor: str | None = None,
    ) -> DealFeedResponse:
        _ = cursor
        return pipeline.deals.feed(verdict=verdict, q=q, limit=limit)

    @router.get("/deals/{deal_id}", response_model=AnalyzeResponse)
    def get_deal(deal_id: str) -> AnalyzeResponse:
        record = pipeline.deals.get(deal_id)
        if not record:
            raise HTTPException(status_code=404, detail="deal not found")
        return record

    @router.get("/cache/metrics", response_model=CacheMetrics)
    def cache_metrics() -> CacheMetrics:
        return pipeline.metrics.snapshot()

    return router
