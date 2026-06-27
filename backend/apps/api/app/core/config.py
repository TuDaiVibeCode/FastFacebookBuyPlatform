from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _backend_root() -> Path:
    return Path(__file__).resolve().parents[4]


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    return int(os.getenv(name, str(default)))


def _env_float(name: str, default: float) -> float:
    return float(os.getenv(name, str(default)))


def _env_path(name: str, default: Path) -> Path:
    value = os.getenv(name)
    if not value:
        return default
    path = Path(value)
    if path.is_absolute():
        return path
    return _backend_root() / path


@dataclass(frozen=True)
class Settings:
    api_name: str = "Deal Radar API"
    api_version: str = "0.1.0"
    exact_cache_ttl_seconds: int = 60 * 60 * 24
    semantic_cache_threshold: float = 0.90
    use_mock_llm: bool = True
    strict_source_policy: bool = False
    sample_data_dir: Path = _backend_root() / "packages" / "sample-data"
    redis_url: str = "redis://redis:6379/0"
    chroma_url: str = "http://chromadb:8000"
    openai_api_key: str | None = None


def get_settings() -> Settings:
    return Settings(
        api_name=os.getenv("API_NAME", "Deal Radar API"),
        api_version=os.getenv("API_VERSION", "0.1.0"),
        exact_cache_ttl_seconds=_env_int("EXACT_CACHE_TTL_SECONDS", 60 * 60 * 24),
        semantic_cache_threshold=_env_float("SEMANTIC_CACHE_THRESHOLD", 0.90),
        use_mock_llm=_env_bool("USE_MOCK_LLM", True),
        strict_source_policy=_env_bool("STRICT_SOURCE_POLICY", False),
        sample_data_dir=_env_path(
            "SAMPLE_DATA_DIR",
            _backend_root() / "packages" / "sample-data",
        ),
        redis_url=os.getenv("REDIS_URL", "redis://redis:6379/0"),
        chroma_url=os.getenv("CHROMA_URL", "http://chromadb:8000"),
        openai_api_key=os.getenv("OPENAI_API_KEY") or None,
    )

