from __future__ import annotations

import re
from copy import deepcopy
from dataclasses import dataclass

from app.modules.normalization.service import extract_price, product_signature
from app.shared.schemas import NormalizedItem


TOKEN_PATTERN = re.compile(r"[a-z0-9]+")


@dataclass(frozen=True)
class SemanticHit:
    item: NormalizedItem
    similarity: float


class InMemorySemanticCache:
    collection_name = "post_semantic_cache"

    def __init__(self, threshold: float) -> None:
        self._threshold = threshold
        self._entries: list[tuple[str | None, int | None, set[str], NormalizedItem]] = []

    def lookup(self, normalized_text: str, raw_text_hash: str) -> SemanticHit | None:
        product = product_signature(normalized_text)["product_name"]
        price = extract_price(normalized_text)
        tokens = set(TOKEN_PATTERN.findall(normalized_text))
        best: SemanticHit | None = None

        for entry_product, entry_price, entry_tokens, item in self._entries:
            if not product or product != entry_product:
                continue
            price_close = entry_price is not None and price is not None and abs(entry_price - price) <= max(100_000, entry_price * 0.05)
            overlap = len(tokens & entry_tokens) / max(1, len(tokens | entry_tokens))
            similarity = 0.95 if price_close else min(0.89, overlap)
            if similarity >= self._threshold and (best is None or similarity > best.similarity):
                cloned = item.model_copy(update={"raw_text_hash": raw_text_hash})
                best = SemanticHit(item=cloned, similarity=similarity)

        return best

    def store(self, normalized_text: str, item: NormalizedItem) -> None:
        product = item.product_name
        tokens = set(TOKEN_PATTERN.findall(normalized_text))
        self._entries.append((product, item.asking_price, tokens, deepcopy(item)))

    def clear(self) -> None:
        self._entries.clear()

