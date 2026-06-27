from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def make_client() -> TestClient:
    return TestClient(create_app())


def analyze(client: TestClient, text: str, source: str = "sample") -> dict:
    response = client.post("/api/v1/deals/analyze", json={"text": text, "source": source})
    assert response.status_code == 201, response.text
    return response.json()


def test_health_reports_ready_services() -> None:
    client = make_client()
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["api"] == "ok"
    assert payload["exact_cache"] == "in_memory_redis_compatible"
    assert payload["semantic_cache"] == "post_semantic_cache"
    assert payload["llm_mode"] == "mock"
    assert payload["sample_data_loaded"] is True


def test_real_llm_mode_requires_openai_key() -> None:
    settings = Settings(use_mock_llm=False, openai_api_key=None)

    with pytest.raises(ValueError, match="OPENAI_API_KEY"):
        create_app(settings)


def test_health_reports_openai_when_real_llm_is_configured() -> None:
    settings = Settings(use_mock_llm=False, openai_api_key="test-key")
    client = TestClient(create_app(settings))

    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["llm_mode"] == "openai"


def test_analyze_miss_then_redis_hit_updates_metrics() -> None:
    client = make_client()
    text = "pass ss s23 ultra 9tr xuoc dam nhe gia hat de"

    first = analyze(client, text)
    second = analyze(client, text)
    metrics = client.get("/api/v1/cache/metrics").json()

    assert first["cache"] == "miss"
    assert first["deal"]["verdict"] == "HOT_DEAL"
    assert "redis_miss" in first["trace"]
    assert second["cache"] == "redis_hit"
    assert "redis_hit" in second["trace"]
    assert metrics["total_analyze_requests"] == 2
    assert metrics["exact_cache_hits"] == 1
    assert metrics["llm_calls_avoided"] == 1
    assert metrics["llm_calls_made"] == 1
    assert metrics["cache_hit_rate"] == 0.5


def test_paraphrase_uses_semantic_cache_and_skips_mock_llm() -> None:
    client = make_client()
    original = analyze(client, "pass ss s23 ultra 9tr xuoc dam nhe gia hat de")
    paraphrase = analyze(client, "can bay samsung s23u 9 tr may con ngon ai lay ib")

    assert original["cache"] == "miss"
    assert paraphrase["cache"] == "semantic_hit"
    assert "semantic_hit" in paraphrase["trace"]
    assert "mock_llm" not in paraphrase["trace"]
    assert paraphrase["item"]["product_name"] == "Samsung Galaxy S23 Ultra"
    assert paraphrase["deal"]["discount_pct"] == 40.0


def test_sold_post_returns_ignore() -> None:
    client = make_client()
    payload = analyze(client, "da ban s23 ultra 9tr cam on moi nguoi")

    assert payload["deal"]["verdict"] == "IGNORE"
    assert payload["item"]["sold_status"] is True


def test_missing_price_returns_ignore() -> None:
    client = make_client()
    payload = analyze(client, "s23 ultra con moi gia ib them anh")

    assert payload["deal"]["verdict"] == "IGNORE"
    assert payload["item"]["asking_price"] is None


def test_feed_and_detail_include_analyzed_deal() -> None:
    client = make_client()
    analyzed = analyze(client, "iphone 13 pro 10tr may dep pin 88 hcm")

    feed = client.get("/api/v1/deals").json()
    detail = client.get(f"/api/v1/deals/{analyzed['id']}").json()

    assert feed["items"][0]["id"] == analyzed["id"]
    assert feed["items"][0]["product_name"] == "iPhone 13 Pro"
    assert detail["id"] == analyzed["id"]
    assert detail["item"]["brand"] == "Apple"

