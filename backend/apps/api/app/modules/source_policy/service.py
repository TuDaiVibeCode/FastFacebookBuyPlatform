from __future__ import annotations

from dataclasses import dataclass

from app.core.events import EventBus
from app.shared.errors import SourcePolicyError


@dataclass(frozen=True)
class SourcePolicyResult:
    source: str
    policy_status: str
    trace: str


class SourcePolicyService:
    allowed_sources = {"sample", "manual", "approved"}

    def __init__(self, events: EventBus, strict: bool = False) -> None:
        self._events = events
        self._strict = strict

    def check(self, source: str | None) -> SourcePolicyResult:
        normalized = (source or "sample").lower()
        if normalized in self.allowed_sources:
            status = "allowed"
            trace = "source_policy_ok"
        elif self._strict:
            self._events.publish("SourcePolicyChecked", source=normalized, policy_status="rejected")
            raise SourcePolicyError(f"source '{normalized}' is not allowed")
        else:
            status = "warning_unknown_source"
            trace = "source_policy_warning"

        self._events.publish("SourcePolicyChecked", source=normalized, policy_status=status)
        return SourcePolicyResult(source=normalized, policy_status=status, trace=trace)

