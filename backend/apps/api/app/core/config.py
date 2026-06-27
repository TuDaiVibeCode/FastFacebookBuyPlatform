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


def _env_csv(name: str, default: tuple[str, ...]) -> tuple[str, ...]:
    value = os.getenv(name)
    if value is None:
        return default
    return tuple(item.strip() for item in value.split(",") if item.strip())



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
    cors_origins: tuple[str, ...] = (
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
    )
    use_mock_llm: bool = True
    strict_source_policy: bool = False
    sample_data_dir: Path = _backend_root() / "packages" / "sample-data"
    redis_url: str = "redis://redis:6379/0"
    chroma_url: str = "http://chromadb:8000"
    database_url: str = "postgresql://dealradar:dealradar@postgres:5432/deal_radar"
    jwt_secret_key: str = "dev-change-me-now"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24
    openai_api_key: str | None = None
    llm_provider: str = "openai"
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4.1-mini"
    openai_timeout_seconds: float = 20.0


def get_settings() -> Settings:
    return Settings(
        api_name=os.getenv("API_NAME", "Deal Radar API"),
        api_version=os.getenv("API_VERSION", "0.1.0"),
        exact_cache_ttl_seconds=_env_int("EXACT_CACHE_TTL_SECONDS", 60 * 60 * 24),
        semantic_cache_threshold=_env_float("SEMANTIC_CACHE_THRESHOLD", 0.90),
        cors_origins=_env_csv(
            "CORS_ORIGINS",
            (
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:3002",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:3001",
                "http://127.0.0.1:3002",
                "http://localhost:8081",
                "http://127.0.0.1:8081",
            ),
        ),
        use_mock_llm=_env_bool("USE_MOCK_LLM", True),
        strict_source_policy=_env_bool("STRICT_SOURCE_POLICY", False),
        sample_data_dir=_env_path(
            "SAMPLE_DATA_DIR",
            _backend_root() / "packages" / "sample-data",
        ),
        redis_url=os.getenv("REDIS_URL", "redis://redis:6379/0"),
        chroma_url=os.getenv("CHROMA_URL", "http://chromadb:8000"),
        database_url=os.getenv(
            "DATABASE_URL",
            "postgresql://dealradar:dealradar@postgres:5432/deal_radar",
        ),
        openai_api_key=os.getenv("OPENAI_API_KEY") or None,
        jwt_secret_key=os.getenv("JWT_SECRET_KEY", "dev-change-me-now"),
        jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
        jwt_expire_minutes=_env_int("JWT_EXPIRE_MINUTES", 60 * 24),
        llm_provider=os.getenv("LLM_PROVIDER", "openai"),
        openai_base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        openai_timeout_seconds=_env_float("OPENAI_TIMEOUT_SECONDS", 20.0),
    )
