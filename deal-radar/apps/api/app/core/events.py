from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass(frozen=True)
class DomainEvent:
    name: str
    payload: dict[str, Any] = field(default_factory=dict)
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class EventBus:
    def __init__(self) -> None:
        self._events: list[DomainEvent] = []

    def publish(self, name: str, **payload: Any) -> None:
        self._events.append(DomainEvent(name=name, payload=payload))

    def list_events(self) -> list[DomainEvent]:
        return list(self._events)

    def clear(self) -> None:
        self._events.clear()

