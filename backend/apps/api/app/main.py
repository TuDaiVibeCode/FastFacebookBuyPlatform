from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException, Query

from app.core.config import Settings, get_settings
from app.core.events import EventBus
from app.modules.arbitrage import ArbitrageService
from app.modules.cache import InMemoryExactCache
from app.modules.deals import DealRepository
from app.modules.ingestion import IngestionService
from app.modules.listings import to_listing_boundary
from app.modules.normalization import MockNormalizer
from app.modules.pricing import PricingService
from app.modules.semantic_cache import InMemorySemanticCache
from app.modules.source_policy import SourcePolicyService
from app.shared.errors import SourcePolicyError
from app.shared.ids import DealIdGenerator
from app.shared.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    CacheMetrics,
    CacheSource,
    DealFeedResponse,
    HealthResponse,
    SourceMetadata,
    Verdict,
)


class MetricsRecorder:
    def __init__(self) -> None:
        self.total_analyze_requests = 0
        self.exact_cache_hits = 0
        self.semantic_cache_hits = 0
        self.llm_calls_avoided = 0
        self.llm_calls_made = 0

    def snapshot(self) -> CacheMetrics:
        hits = self.exact_cache_hits + self.semantic_cache_hits
        hit_rate = round(hits / self.total_analyze_requests, 4) if self.total_analyze_requests else 0.0
        return CacheMetrics(
            total_analyze_requests=self.total_analyze_requests,
            exact_cache_hits=self.exact_cache_hits,
            semantic_cache_hits=self.semantic_cache_hits,
            llm_calls_avoided=self.llm_calls_avoided,
            llm_calls_made=self.llm_calls_made,
            estimated_cost_saved=round(self.llm_calls_avoided * 0.002, 4),
            cache_hit_rate=hit_rate,
        )


class AnalyzePipeline:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.events = EventBus()
        self.ids = DealIdGenerator()
        self.metrics = MetricsRecorder()
        self.ingestion = IngestionService(self.events)
        self.policy = SourcePolicyService(self.events, strict=settings.strict_source_policy)
        self.exact_cache = InMemoryExactCache(ttl_seconds=settings.exact_cache_ttl_seconds)
        self.semantic_cache = InMemorySemanticCache(threshold=settings.semantic_cache_threshold)
        self.normalizer = MockNormalizer(self.events)
        self.pricing = PricingService(settings.sample_data_dir)
        self.arbitrage = ArbitrageService(self.events)
        self.deals = DealRepository()

    def analyze(self, request: AnalyzeRequest) -> AnalyzeResponse:
        self.metrics.total_analyze_requests += 1
        ingested = self.ingestion.ingest(request.text)
        trace: list[str] = []

        try:
            policy = self.policy.check(request.source)
        except SourcePolicyError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        trace.append(policy.trace)

        cached = self.exact_cache.get(ingested.raw_text_hash)
        if cached:
            self.metrics.exact_cache_hits += 1
            self.metrics.llm_calls_avoided += 1
            self.events.publish("CacheHitRecorded", cache="redis_hit", raw_text_hash=ingested.raw_text_hash)
            return self._persist_from_cached(cached, request, policy, CacheSource.redis_hit, ["redis_hit", "stored"])

        trace.append("redis_miss")
        semantic_hit = self.semantic_cache.lookup(ingested.normalized_text, ingested.raw_text_hash)
        if semantic_hit:
            self.metrics.semantic_cache_hits += 1
            self.metrics.llm_calls_avoided += 1
            self.events.publish(
                "CacheHitRecorded",
                cache="semantic_hit",
                raw_text_hash=ingested.raw_text_hash,
                similarity=semantic_hit.similarity,
            )
            trace.extend(["semantic_hit", f"semantic_similarity:{semantic_hit.similarity:.2f}"])
            item = semantic_hit.item
            cache_source = CacheSource.semantic_hit
        else:
            trace.append("semantic_miss")
            self.metrics.llm_calls_made += 1
            item = self.normalizer.normalize(ingested.normalized_text, ingested.raw_text_hash)
            trace.append("mock_llm")
            cache_source = CacheSource.miss

        market_price = self.pricing.get_market_price(item.product_name)
        score = self.arbitrage.score(item, market_price)
        now = datetime.now(timezone.utc)
        record = AnalyzeResponse(
            id=self.ids.next_id(),
            cache=cache_source,
            item=item,
            deal=score,
            trace=[*trace, "scored", "stored"],
            raw_text=request.text,
            source=SourceMetadata(
                source=policy.source,
                source_url=request.source_url,
                policy_status=policy.policy_status,
            ),
            created_at=now,
            updated_at=now,
        )
        self.exact_cache.set(ingested.raw_text_hash, record.model_dump(mode="json"))
        if cache_source == CacheSource.miss:
            self.semantic_cache.store(ingested.normalized_text, item)
        self.deals.save(record)
        self.events.publish("ListingStored", listing=to_listing_boundary(record).model_dump(mode="json"))
        return record

    def _persist_from_cached(
        self,
        cached: dict[str, Any],
        request: AnalyzeRequest,
        policy: Any,
        cache_source: CacheSource,
        extra_trace: list[str],
    ) -> AnalyzeResponse:
        now = datetime.now(timezone.utc)
        base = AnalyzeResponse.model_validate(cached)
        record = base.model_copy(
            update={
                "id": self.ids.next_id(),
                "cache": cache_source,
                "trace": ["source_policy_ok", *extra_trace],
                "raw_text": request.text,
                "source": SourceMetadata(
                    source=policy.source,
                    source_url=request.source_url,
                    policy_status=policy.policy_status,
                ),
                "created_at": now,
                "updated_at": now,
            }
        )
        self.deals.save(record)
        self.events.publish("ListingStored", listing=to_listing_boundary(record).model_dump(mode="json"))
        return record


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    pipeline = AnalyzePipeline(settings)
    api = FastAPI(title=settings.api_name, version=settings.api_version)
    api.state.pipeline = pipeline

    @api.get("/api/v1/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(
            api="ok",
            exact_cache=pipeline.exact_cache.backend_name,
            semantic_cache=pipeline.semantic_cache.collection_name,
            llm_mode="mock" if settings.use_mock_llm else "real",
            sample_data_loaded=pipeline.pricing.ready(),
            market_price_count=pipeline.pricing.count(),
        )

    @api.post("/api/v1/analyze", response_model=AnalyzeResponse)
    def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
        return pipeline.analyze(request)

    @api.get("/api/v1/deals", response_model=DealFeedResponse)
    def deals(
        verdict: Verdict | None = None,
        q: str | None = None,
        limit: int = Query(default=20, ge=1, le=100),
        cursor: str | None = None,
    ) -> DealFeedResponse:
        _ = cursor
        return pipeline.deals.feed(verdict=verdict, q=q, limit=limit)

    @api.get("/api/v1/deals/{deal_id}", response_model=AnalyzeResponse)
    def deal_detail(deal_id: str) -> AnalyzeResponse:
        record = pipeline.deals.get(deal_id)
        if not record:
            raise HTTPException(status_code=404, detail="deal not found")
        return record

    @api.get("/api/v1/metrics/cache", response_model=CacheMetrics)
    def cache_metrics() -> CacheMetrics:
        return pipeline.metrics.snapshot()

    return api


app = create_app()

