from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _backend_root() -> Path:
    return Path(__file__).resolve().parents[4]


@dataclass(frozen=True)
class Settings:
    api_name: str = "Deal Radar API"
    api_version: str = "0.1.0"
    exact_cache_ttl_seconds: int = 60 * 60 * 24
    semantic_cache_threshold: float = float(os.getenv("SEMANTIC_CACHE_THRESHOLD", "0.90"))
    use_mock_llm: bool = os.getenv("USE_MOCK_LLM", "true").lower() != "false"
    strict_source_policy: bool = os.getenv("STRICT_SOURCE_POLICY", "false").lower() == "true"
    sample_data_dir: Path = _backend_root() / "packages" / "sample-data"


def get_settings() -> Settings:
    return Settings()

