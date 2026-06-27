from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass

from app.core.events import EventBus


@dataclass(frozen=True)
class IngestedPost:
    normalized_text: str
    raw_text_hash: str


class IngestionService:
    def __init__(self, events: EventBus) -> None:
        self._events = events

    def ingest(self, raw_text: str) -> IngestedPost:
        normalized = re.sub(r"\s+", " ", raw_text.strip()).lower()
        digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
        self._events.publish("PostIngested", raw_text_hash=digest)
        return IngestedPost(normalized_text=normalized, raw_text_hash=digest)

