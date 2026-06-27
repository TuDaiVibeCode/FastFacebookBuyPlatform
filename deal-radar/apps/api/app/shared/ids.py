from __future__ import annotations


class DealIdGenerator:
    def __init__(self) -> None:
        self._next = 1

    def next_id(self) -> str:
        value = f"deal_{self._next:04d}"
        self._next += 1
        return value

