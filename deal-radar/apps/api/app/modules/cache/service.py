from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta, timezone
from typing import Any


class InMemoryExactCache:
    backend_name = "in_memory_redis_compatible"

    def __init__(self, ttl_seconds: int) -> None:
        self._ttl = timedelta(seconds=ttl_seconds)
        self._store: dict[str, tuple[datetime, dict[str, Any]]] = {}

    @staticmethod
    def key(raw_text_hash: str) -> str:
        return f"post:sha256:{raw_text_hash}"

    def get(self, raw_text_hash: str) -> dict[str, Any] | None:
        key = self.key(raw_text_hash)
        value = self._store.get(key)
        if not value:
            return None
        expires_at, payload = value
        if expires_at <= datetime.now(timezone.utc):
            self._store.pop(key, None)
            return None
        return deepcopy(payload)

    def set(self, raw_text_hash: str, payload: dict[str, Any]) -> None:
        self._store[self.key(raw_text_hash)] = (datetime.now(timezone.utc) + self._ttl, deepcopy(payload))

    def clear(self) -> None:
        self._store.clear()

