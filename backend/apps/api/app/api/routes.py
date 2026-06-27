from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Query

from app.application import AnalyzePipeline
from app.core.config import Settings
from app.modules.auth import AuthService, UserRepository
from app.shared.schemas import (
    AnalyzeRequest,
    LoginRequest,
    AnalyzeResponse,
    CacheMetrics,
    DealFeedResponse,
    AuthTokenResponse,
    HealthResponse,
    RegisterRequest,
    User,
    Verdict,
)


def build_api_router(pipeline: AnalyzePipeline, settings: Settings) -> APIRouter:
    router = APIRouter(prefix="/api/v1")
    auth_service = AuthService(UserRepository(settings.database_url), settings)

    @router.post("/auth/register", response_model=AuthTokenResponse, status_code=201)
    def register(payload: RegisterRequest) -> AuthTokenResponse:
        return auth_service.register(payload)

    @router.post("/auth/login", response_model=AuthTokenResponse)
    def login(payload: LoginRequest) -> AuthTokenResponse:
        return auth_service.login(payload)

    def get_current_user(authorization: str | None = Header(default=None)) -> User:
        return auth_service.get_current_user(authorization)

    @router.get("/auth/me", response_model=User)
    def me(current_user: User = Depends(get_current_user)) -> User:
        return current_user

    @router.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(
            api="ok",
            exact_cache=pipeline.exact_cache.backend_name,
            semantic_cache=pipeline.semantic_cache.collection_name,
            llm_mode="mock" if settings.use_mock_llm else settings.llm_provider,
            sample_data_loaded=pipeline.pricing.ready(),
            market_price_count=pipeline.pricing.count(),
        )

    @router.post("/deals/analyze", response_model=AnalyzeResponse, status_code=201)
    def analyze_deal(request: AnalyzeRequest) -> AnalyzeResponse:
        try:
            return pipeline.analyze(request)
        except ValueError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

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
