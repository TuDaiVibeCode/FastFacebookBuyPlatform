from __future__ import annotations

from app.core.events import EventBus
from app.shared.schemas import DealScore, NormalizedItem, Verdict


class ArbitrageService:
    def __init__(self, events: EventBus) -> None:
        self._events = events

    def score(self, item: NormalizedItem, market_price: int | None) -> DealScore:
        if item.sold_status or not item.asking_price or not market_price or item.confidence < 0.7:
            score = DealScore(market_price=market_price, discount_pct=None, verdict=Verdict.ignore)
            self._events.publish("DealScored", verdict=score.verdict.value)
            return score

        discount = round(((market_price - item.asking_price) / market_price) * 100, 2)
        if discount >= 40:
            verdict = Verdict.hot_deal
        elif discount >= 20:
            verdict = Verdict.ok_deal
        else:
            verdict = Verdict.ignore

        score = DealScore(market_price=market_price, discount_pct=discount, verdict=verdict)
        self._events.publish("DealScored", verdict=score.verdict.value, discount_pct=discount)
        if verdict == Verdict.hot_deal:
            self._events.publish("HotDealDetected", product_name=item.product_name, discount_pct=discount)
        return score

