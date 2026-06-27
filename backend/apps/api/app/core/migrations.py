from __future__ import annotations

from pathlib import Path
from os import getenv
import logging

import psycopg


LOGGER = logging.getLogger(__name__)


def apply_auth_migrations(database_url: str) -> None:
    if not database_url:
        LOGGER.warning("DATABASE_URL not configured; skipping auth migrations")
        return

    migrations_dir = Path(__file__).resolve().parents[1] / "db" / "migrations"
    if not migrations_dir.exists():
        return

    migration_files = sorted(migrations_dir.glob("*.sql"))
    if not migration_files:
        return

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

