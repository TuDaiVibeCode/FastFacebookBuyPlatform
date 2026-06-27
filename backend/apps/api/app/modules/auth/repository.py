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


class UserRepository:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url

    def get_user_by_email(self, email: str) -> UserRecord | None:
        with psycopg.connect(self.database_url) as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id, email, password_hash, created_at FROM users WHERE email = %s",
                    (email,),
                )
                row = cursor.fetchone()
        if not row:
            return None
        return UserRecord(id=str(row[0]), email=row[1], password_hash=row[2], created_at=row[3])

    def get_user_by_id(self, user_id: str) -> UserRecord | None:
        with psycopg.connect(self.database_url) as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id, email, password_hash, created_at FROM users WHERE id = %s",
                    (user_id,),
                )
                row = cursor.fetchone()
        if not row:
            return None
        return UserRecord(id=str(row[0]), email=row[1], password_hash=row[2], created_at=row[3])

    def create_user(self, email: str, password_hash: str) -> UserRecord:
        try:
            with psycopg.connect(self.database_url) as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO users (email, password_hash)
                        VALUES (%s, %s)
                        RETURNING id, email, password_hash, created_at
                        """,
                        (email, password_hash),
                    )
                    row = cursor.fetchone()
                conn.commit()
        except UniqueViolation as exc:
            raise ValueError("EMAIL_ALREADY_EXISTS") from exc
        if not row:
            raise RuntimeError("Failed to create user")
        return UserRecord(id=str(row[0]), email=row[1], password_hash=row[2], created_at=row[3])

