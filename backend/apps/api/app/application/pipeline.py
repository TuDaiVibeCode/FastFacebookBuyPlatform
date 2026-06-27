from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException

from app.application.metrics import MetricsRecorder
from app.core.config import Settings
from app.core.events import EventBus
from app.modules.arbitrage import ArbitrageService
from app.modules.cache import InMemoryExactCache
from app.modules.deals import DealRepository
from app.modules.ingestion import IngestionService
from app.modules.listings import to_listing_boundary
from app.modules.normalization import MockNormalizer, OpenAINormalizer
from app.modules.pricing import PricingService
from app.modules.semantic_cache import InMemorySemanticCache
from app.modules.source_policy import SourcePolicyService
from app.shared.errors import SourcePolicyError
from app.shared.ids import DealIdGenerator
from app.shared.schemas import AnalyzeRequest, AnalyzeResponse, CacheSource, SourceMetadata


class AnalyzePipeline:
    """Coordinates module services without hiding domain boundaries.

    The monolith keeps synchronous in-process calls today, but every state
    transition publishes a domain event so the same boundaries can later move
    behind a broker.
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.events = EventBus()
        self.ids = DealIdGenerator()
        self.metrics = MetricsRecorder()
        self.ingestion = IngestionService(self.events)
        self.policy = SourcePolicyService(self.events, strict=settings.strict_source_policy)
        self.exact_cache = InMemoryExactCache(ttl_seconds=settings.exact_cache_ttl_seconds)
        self.semantic_cache = InMemorySemanticCache(threshold=settings.semantic_cache_threshold)
        self.normalizer = self._build_normalizer(settings)
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
            trace.append("mock_llm" if self.settings.use_mock_llm else f"{self.settings.llm_provider}_llm")
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

    def _build_normalizer(self, settings: Settings) -> MockNormalizer | OpenAINormalizer:
        if settings.use_mock_llm:
            return MockNormalizer(self.events)
        if settings.llm_provider != "openai":
            raise ValueError(f"unsupported LLM_PROVIDER '{settings.llm_provider}'")
        return OpenAINormalizer(
            self.events,
            api_key=settings.openai_api_key or "",
            model=settings.openai_model,
            base_url=settings.openai_base_url,
            timeout_seconds=settings.openai_timeout_seconds,
        )

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
