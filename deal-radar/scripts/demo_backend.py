#!/usr/bin/env python3
"""Exercise the Deal Radar backend cache demo."""

from __future__ import annotations

import argparse
import json
import sys
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


FRESH_POST = "pass ss s23 ultra 9tr xuoc dam nhe, gia hat de"
PARAPHRASE_POST = "can bay samsung s23u 9 trieu, may con ngon, fix nhe"


def request_json(method: str, url: str, payload: dict[str, Any] | None = None, timeout: float = 10) -> Any:
    data = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = Request(url, data=data, headers=headers, method=method)
    with urlopen(request, timeout=timeout) as response:
        body = response.read().decode("utf-8")
    return json.loads(body) if body else None


def wait_for_health(base_url: str, attempts: int, delay: float) -> None:
    health_url = f"{base_url}/api/v1/health"
    last_error: Exception | None = None

    for _ in range(attempts):
        try:
            health = request_json("GET", health_url, timeout=3)
            print_step("health", health)
            return
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            time.sleep(delay)

    raise RuntimeError(f"API health check failed at {health_url}: {last_error}")


def analyze(base_url: str, text: str, source: str) -> dict[str, Any]:
    result = request_json(
        "POST",
        f"{base_url}/api/v1/analyze",
        {"text": text, "source": source},
    )
    if not isinstance(result, dict):
        raise RuntimeError(f"Expected JSON object from analyze, got {type(result).__name__}")
    return result


def metrics(base_url: str) -> Any:
    return request_json("GET", f"{base_url}/api/v1/metrics/cache")


def cache_value(result: dict[str, Any]) -> str:
    value = result.get("cache")
    if not isinstance(value, str):
        raise RuntimeError(f"Analyze response missing string cache field: {result}")
    return value


def print_step(label: str, value: Any) -> None:
    print(f"\n== {label} ==")
    print(json.dumps(value, indent=2, sort_keys=True))


def assert_cache(label: str, result: dict[str, Any], expected: str, strict: bool) -> None:
    actual = cache_value(result)
    if actual == expected:
        return

    message = f"{label} expected cache={expected!r}, got {actual!r}"
    if strict:
        raise RuntimeError(message)
    print(f"WARNING: {message}", file=sys.stderr)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the Deal Radar backend cache demo.")
    parser.add_argument("--base-url", default="http://localhost:18000", help="Backend base URL.")
    parser.add_argument("--source", default="sample", help="Source type sent to /api/v1/analyze.")
    parser.add_argument("--health-attempts", type=int, default=30, help="Health polling attempts.")
    parser.add_argument("--health-delay", type=float, default=1.0, help="Seconds between health attempts.")
    parser.add_argument("--no-strict", action="store_true", help="Print cache mismatches instead of failing.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    base_url = args.base_url.rstrip("/")
    strict = not args.no_strict

    try:
        wait_for_health(base_url, args.health_attempts, args.health_delay)

        first = analyze(base_url, FRESH_POST, args.source)
        print_step("first analyze", first)
        assert_cache("first analyze", first, "miss", strict)

        second = analyze(base_url, FRESH_POST, args.source)
        print_step("repeat analyze", second)
        assert_cache("repeat analyze", second, "redis_hit", strict)

        third = analyze(base_url, PARAPHRASE_POST, args.source)
        print_step("paraphrase analyze", third)
        assert_cache("paraphrase analyze", third, "semantic_hit", strict)

        print_step("cache metrics", metrics(base_url))
    except (HTTPError, URLError, TimeoutError, RuntimeError, json.JSONDecodeError) as exc:
        print(f"demo failed: {exc}", file=sys.stderr)
        return 1

    print("\nDemo passed: miss -> redis_hit -> semantic_hit -> metrics")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
