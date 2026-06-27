from __future__ import annotations

from datetime import datetime, timezone
import re
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
from app.shared.schemas import AnalyzeRequest, AnalyzeResponse, CacheSource, NormalizedItem, SourceMetadata


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
        is_search_query = self._is_search_like_query(ingested.normalized_text)

        try:
            policy = self.policy.check(request.source)
        except SourcePolicyError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        trace.append(policy.trace)

        if is_search_query:
            trace.append("redis_miss")
            self.metrics.llm_calls_made += 1
            return self._handle_search_query(request, ingested, policy, trace)

        cached = self.exact_cache.get(ingested.raw_text_hash)
        if cached:
            self.metrics.exact_cache_hits += 1
            self.metrics.llm_calls_avoided += 1
            self.events.publish("CacheHitRecorded", cache="redis_hit", raw_text_hash=ingested.raw_text_hash)
            return self._persist_from_cached(
                cached,
                request,
                policy,
                CacheSource.redis_hit,
                ["redis_hit", "stored"],
            )

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
        assistant_reply = self._compose_assistant_reply(
            request.text,
            item,
            market_price,
            score.discount_pct,
            score.verdict.value,
        )
        now = datetime.now(timezone.utc)
        record = AnalyzeResponse(
            id=self.ids.next_id(),
            cache=cache_source,
            item=item,
            deal=score,
            trace=[*trace, "scored", "stored"],
            assistant_reply=assistant_reply,
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

    def _handle_search_query(
        self,
        request: AnalyzeRequest,
        ingested,
        policy,
        trace: list[str],
    ) -> AnalyzeResponse:
        item = self._build_search_intent_item(request.text, ingested.raw_text_hash)
        market_price = self.pricing.get_market_price(item.product_name)
        score = self.arbitrage.score(item, market_price)
        assistant_reply = self._compose_search_reply(
            raw_text=request.text,
            item=item,
            market_price=market_price,
        )
        now = datetime.now(timezone.utc)
        trace = [*trace, "search_query_detected", "scored", "stored"]
        record = AnalyzeResponse(
            id=self.ids.next_id(),
            cache=CacheSource.miss,
            item=item,
            deal=score,
            trace=trace,
            assistant_reply=assistant_reply,
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
        self.deals.save(record)
        self.events.publish("ListingStored", listing=to_listing_boundary(record).model_dump(mode="json"))
        return record

    def _compose_assistant_reply(
        self,
        raw_text: str,
        item: Any,
        market_price: int | None,
        discount_pct: float | None,
        verdict: str,
    ) -> str:
        try:
            return self.normalizer.compose_response(
                raw_text=raw_text,
                item=item,
                market_price=market_price,
                discount_pct=discount_pct,
                verdict=verdict,
            )
        except Exception:
            return self._fallback_reply(item, market_price, discount_pct, verdict, raw_text=raw_text)

    def _compose_search_reply(
        self,
        raw_text: str,
        item: NormalizedItem,
        market_price: int | None,
    ) -> str:
        try:
            return self.normalizer.compose_search_reply(
                raw_text=raw_text,
                inferred_product=item.product_name,
                raw_text_hash=item.raw_text_hash,
                market_price=market_price,
            )
        except Exception:
            return self._fallback_search_reply(item, market_price)

    def _fallback_search_reply(self, item: NormalizedItem, market_price: int | None) -> str:
        product = item.product_name or "Sản phẩm"
        if market_price is None:
            return (
                f"{product}: chưa có giá tham chiếu nội bộ đủ sát để so sánh. "
                "Bạn có thể nhờ người bán gửi ảnh, chi tiết tình trạng, phụ kiện, thời gian dùng và giá chào để mình chấm điểm chuẩn hơn."
            )
        return (
            f"{product}: có giá tham chiếu hiện tại, nhưng chưa có bài cần so sánh. "
            "Hãy gửi thông tin bài đăng cụ thể để mình đánh giá nhanh."
        )

    def _fallback_reply(
        self,
        item: Any,
        market_price: int | None,
        discount_pct: float | None,
        verdict: str,
        *,
        raw_text: str,
    ) -> str:
        if self._is_search_like_query(raw_text):
            return self._fallback_search_reply(item, market_price)

        product = item.product_name or "Sản phẩm"
        if market_price is None or item.asking_price is None:
            return f"{product}: thiếu giá chào hoặc giá thị trường, chưa thể đánh giá."
        if item.sold_status:
            return f"{product}: bài đăng có dấu hiệu đã bán/chốt, đừng vội mua."
        if discount_pct is None:
            return f"{product}: chưa đủ dữ liệu để đo chênh lệch giá."
        if verdict == "HOT_DEAL":
            return f"{product}: cơ hội tốt, giá thấp hơn thị trường khoảng {discount_pct:.0f}%."
        if verdict == "OK_DEAL":
            return f"{product}: giá tạm ổn, giảm khoảng {discount_pct:.0f}%. Nên xem kỹ tình trạng."
        return f"{product}: chưa phải mức giá hấp dẫn; xem thêm so sánh và thương lượng."

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
        regenerate_assistant_reply: bool = False,
    ) -> AnalyzeResponse:
        assistant_reply = cached.get("assistant_reply")
        if isinstance(assistant_reply, str):
            assistant_reply = assistant_reply.strip() or None
        if regenerate_assistant_reply or (assistant_reply and self._is_search_like_query(request.text)):
            item = NormalizedItem.model_validate(cached["item"])  # type: ignore[arg-type]
            market_price = cached.get("deal", {}).get("market_price")  # type: ignore[index]
            assistant_reply = self._compose_search_reply(
                raw_text=request.text,
                item=item,
                market_price=market_price,
            )

        if not assistant_reply:
            item = NormalizedItem.model_validate(cached["item"])  # type: ignore[arg-type]
            market_price = cached.get("deal", {}).get("market_price")  # type: ignore[index]
            discount_pct = cached.get("deal", {}).get("discount_pct")  # type: ignore[index]
            verdict = cached.get("deal", {}).get("verdict", "IGNORE")  # type: ignore[index]
            assistant_reply = self._fallback_reply(
                item,
                market_price,
                discount_pct,
                verdict,
                raw_text=request.text,
            )

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
                "assistant_reply": assistant_reply,
            }
        )
        self.deals.save(record)
        self.events.publish("ListingStored", listing=to_listing_boundary(record).model_dump(mode="json"))
        return record

    @staticmethod
    def _is_search_like_query(text: str) -> bool:
        normalized = text.lower()
        search_tokens = (
            "tìm",
            "tim",
            "gợi ý",
            "goi y",
            "đề xuất",
            "de xuat",
            "so sánh",
            "so sanh",
            "best",
            "recommend",
            "recommendation",
            "mua gì",
            "mua gi",
        )
        return any(token in normalized for token in search_tokens)

    def _build_search_intent_item(self, raw_text: str, raw_text_hash: str) -> NormalizedItem:
        product_name = self._infer_search_product(raw_text)

        if product_name is not None:
            product_parts = product_name.split(" ", 1)
            brand = None
            model = None
            if len(product_parts) >= 2:
                brand = product_parts[0]
                model = product_parts[1]

            return NormalizedItem(
                product_name=product_name,
                brand=brand,
                model=model,
                condition="unknown",
                asking_price=None,
                currency="VND",
                sold_status=False,
                location=None,
                confidence=0.8,
                raw_text_hash=raw_text_hash,
            )

        stop_words = {
            "tôi",
            "toi",
            "em",
            "cho",
            "tôi",
            "tui",
            "tim",
            "tìm",
            "gợi",
            "ý",
            "gioi",
            "y",
            "đề",
            "xuất",
            "de",
            "xuat",
            "nên",
            "nhất",
            "tot",
            "nhat",
            "để",
            "de",
            "hien",
            "tai",
            "hiện",
            "tại",
            "recommend",
            "recommendation",
            "best",
            "cho",
            "tôi",
            "tôi",
            "bạn",
            "ban",
            "tốt",
            "tot",
            "nhất",
            "nhat",
            "hơn",
            "hơn",
        }

        normalized_text = re.sub(r"\s+", " ", raw_text.strip().lower())
        tokens = [
            token.strip(".,!?\"'`’")
            for token in normalized_text.split()
            if token.strip(".,!?\"'`’") and token.strip(".,!?\"'`’") not in stop_words
        ]
        product_name = " ".join(tokens[:8]).strip()
        if not product_name:
            product_name = "sản phẩm cần tư vấn"

        return NormalizedItem(
            product_name=product_name,
            brand=None,
            model=None,
            condition="unknown",
            asking_price=None,
            currency="VND",
            sold_status=False,
            location=None,
            confidence=0.72,
            raw_text_hash=raw_text_hash,
        )

    @staticmethod
    def _infer_search_product(raw_text: str) -> str | None:
        normalized = re.sub(r"\s+", " ", raw_text.lower())
        candidates = (
            ("nektar", "se41", "MIDI Controller Nektar SE41"),
            ("nektar", "se61", "MIDI Controller Nektar SE61"),
            ("nektar", "se88", "MIDI Controller Nektar SE88"),
            ("midi", "controller", "MIDI Controller"),
            ("mac", "mini", "m4", "Mac Mini M4"),
            ("mac mini", "m4", "Mac Mini M4"),
            ("m4", "macmini", "Mac Mini M4"),
        )

        for keys in candidates:
            if all(key in normalized for key in keys):
                return keys[-1]

        return None
