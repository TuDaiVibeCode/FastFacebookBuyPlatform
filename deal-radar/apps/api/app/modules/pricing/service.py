from __future__ import annotations

import json
from pathlib import Path


class PricingService:
    def __init__(self, sample_data_dir: Path) -> None:
        self._market_prices = self._load_market_prices(sample_data_dir / "market_price.json")

    @staticmethod
    def _load_market_prices(path: Path) -> dict[str, int]:
        if not path.exists():
            return {}
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        return {str(key): int(value) for key, value in data.items()}

    def get_market_price(self, product_name: str | None) -> int | None:
        if product_name is None:
            return None
        return self._market_prices.get(product_name)

    def count(self) -> int:
        return len(self._market_prices)

    def ready(self) -> bool:
        return bool(self._market_prices)

