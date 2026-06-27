from __future__ import annotations

from datetime import datetime, timezone

from app.shared.schemas import AnalyzeResponse, DealCard, DealFeedResponse, Verdict


class DealRepository:
    def __init__(self) -> None:
        self._records: dict[str, AnalyzeResponse] = {}
        self._order: list[str] = []

    def save(self, record: AnalyzeResponse) -> AnalyzeResponse:
        self._records[record.id] = record
        if record.id not in self._order:
            self._order.insert(0, record.id)
        return record

    def get(self, deal_id: str) -> AnalyzeResponse | None:
        return self._records.get(deal_id)

    def feed(self, verdict: Verdict | None = None, q: str | None = None, limit: int = 20) -> DealFeedResponse:
        now = datetime.now(timezone.utc)
        query = q.lower() if q else None
        cards: list[DealCard] = []
        for deal_id in self._order:
            record = self._records[deal_id]
            if verdict and record.deal.verdict != verdict:
                continue
            if query and query not in record.raw_text.lower() and query not in (record.item.product_name or "").lower():
                continue
            cards.append(
                DealCard(
                    id=record.id,
                    product_name=record.item.product_name,
                    asking_price=record.item.asking_price,
                    market_price=record.deal.market_price,
                    discount_pct=record.deal.discount_pct,
                    verdict=record.deal.verdict,
                    cache=record.cache,
                    freshness_seconds=max(0, int((now - record.updated_at).total_seconds())),
                    created_at=record.created_at,
                )
            )
            if len(cards) >= limit:
                break
        return DealFeedResponse(items=cards)

    def clear(self) -> None:
        self._records.clear()
        self._order.clear()

