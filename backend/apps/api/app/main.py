from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import build_api_router
from app.application import AnalyzePipeline
from app.core.config import Settings, get_settings
from app.core.migrations import apply_auth_migrations


LOGGER = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    pipeline = AnalyzePipeline(settings)
    api = FastAPI(title=settings.api_name, version=settings.api_version)
    try:
        apply_auth_migrations(settings.database_url)
    except Exception:
        LOGGER.exception("Auth migration failed during app startup")
    if settings.cors_origins:
        api.add_middleware(
            CORSMiddleware,
            allow_origins=list(settings.cors_origins),
            allow_methods=["*"],
            allow_headers=["*"],
        )
    api.state.pipeline = pipeline
    api.include_router(build_api_router(pipeline, settings))
    return api


app = create_app()
