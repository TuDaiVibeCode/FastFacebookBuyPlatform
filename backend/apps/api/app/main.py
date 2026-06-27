from __future__ import annotations

from fastapi import FastAPI

from app.api import build_api_router
from app.application import AnalyzePipeline
from app.core.config import Settings, get_settings


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    pipeline = AnalyzePipeline(settings)
    api = FastAPI(title=settings.api_name, version=settings.api_version)
    api.state.pipeline = pipeline
    api.include_router(build_api_router(pipeline, settings))
    return api


app = create_app()
