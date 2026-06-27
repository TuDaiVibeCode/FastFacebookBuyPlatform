from __future__ import annotations

from pathlib import Path
from os import getenv
from urllib.parse import urlparse, urlunparse
import logging

import psycopg


LOGGER = logging.getLogger(__name__)


def _with_database(database_url: str, database_name: str) -> str:
    parsed = urlparse(database_url)
    database_path = f"/{database_name}"
    return urlunparse(
        (parsed.scheme, parsed.netloc, database_path, parsed.params, parsed.query, parsed.fragment)
    )


def _ensure_database(database_url: str) -> str:
    parsed = urlparse(database_url)
    database_name = parsed.path.lstrip("/") or "postgres"
    if database_name == "postgres":
        return database_url

    try:
        with psycopg.connect(database_url, autocommit=True):
            return database_url
    except Exception as exc:
        if "database" not in str(exc) or "does not exist" not in str(exc):
            raise

    admin_url = _with_database(database_url, "postgres")
    with psycopg.connect(admin_url, autocommit=True) as admin_conn:
        with admin_conn.cursor() as cursor:
            quoted = database_name.replace('"', '""')
            cursor.execute(f'CREATE DATABASE "{quoted}"')

    return database_url


def apply_auth_migrations(database_url: str) -> None:
    if not database_url:
        LOGGER.warning("DATABASE_URL not configured; skipping auth migrations")
        return

    backend_root = Path(__file__).resolve().parents[2]
    migrations_dir = backend_root / "db" / "migrations"
    if not migrations_dir.exists():
        return

    migration_files = sorted(migrations_dir.glob("*.sql"))
    if not migration_files:
        return

    database_url = _ensure_database(database_url)
    with psycopg.connect(database_url, autocommit=True) as conn:
        with conn.cursor() as cursor:
            for migration in migration_files:
                cursor.execute(migration.read_text())


def run() -> None:
    database_url = getenv("DATABASE_URL")
    if not database_url:
        LOGGER.info("DATABASE_URL missing, auth migrations skipped")
        return
    try:
        apply_auth_migrations(database_url)
    except Exception:
        LOGGER.exception("Failed to apply auth schema migrations")
        raise


if __name__ == "__main__":
    run()
