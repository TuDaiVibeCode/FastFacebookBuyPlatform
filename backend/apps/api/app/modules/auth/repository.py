from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

import psycopg
from psycopg.errors import UniqueViolation


@dataclass(frozen=True)
class UserRecord:
    id: str
    email: str
    password_hash: str
    created_at: datetime


class DatabaseUnavailableError(RuntimeError):
    """Raised when the auth repository cannot reach persistent storage."""


class UserRepository:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url

    def _execute(
        self,
        query: str,
        params: tuple[object, ...],
        commit: bool = False,
    ) -> list[tuple]:
        try:
            with psycopg.connect(self.database_url) as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, params)
                    rows = cursor.fetchall()
                if commit:
                    conn.commit()
                return rows
        except UniqueViolation:
            raise
        except Exception as exc:
            raise DatabaseUnavailableError("authentication database unavailable") from exc

    def get_user_by_email(self, email: str) -> UserRecord | None:
        try:
            row = self._execute(
                "SELECT id, email, password_hash, created_at FROM users WHERE email = %s",
                (email,),
            )[0]
        except DatabaseUnavailableError:
            raise
        except Exception:
            row = None
        if not row:
            return None
        return UserRecord(id=str(row[0]), email=row[1], password_hash=row[2], created_at=row[3])

    def get_user_by_id(self, user_id: str) -> UserRecord | None:
        try:
            row = self._execute(
                "SELECT id, email, password_hash, created_at FROM users WHERE id = %s",
                (user_id,),
            )[0]
        except DatabaseUnavailableError:
            raise
        except Exception:
            row = None
        if not row:
            return None
        return UserRecord(id=str(row[0]), email=row[1], password_hash=row[2], created_at=row[3])

    def create_user(self, email: str, password_hash: str) -> UserRecord:
        try:
            rows = self._execute(
                """
                INSERT INTO users (email, password_hash)
                VALUES (%s, %s)
                RETURNING id, email, password_hash, created_at
                """,
                (email, password_hash),
                commit=True,
            )
            row = rows[0]
        except UniqueViolation as exc:
            raise ValueError("EMAIL_ALREADY_EXISTS") from exc
        except DatabaseUnavailableError:
            raise
        if not row:
            raise RuntimeError("Failed to create user")
        return UserRecord(id=str(row[0]), email=row[1], password_hash=row[2], created_at=row[3])
