from __future__ import annotations

from fastapi import HTTPException, status

from app.core.config import Settings
from app.shared.schemas import AuthTokenResponse, LoginRequest, RegisterRequest, User
from app.modules.auth.repository import UserRepository
from app.modules.auth.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    parse_bearer_token,
    verify_password,
)


class AuthService:
    def __init__(self, repository: UserRepository, settings: Settings) -> None:
        self.repository = repository
        self.settings = settings

    def register(self, payload: RegisterRequest) -> AuthTokenResponse:
        email = payload.email.strip().lower()
        if self.repository.get_user_by_email(email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists",
            )
        password_hash = hash_password(payload.password)
        try:
            record = self.repository.create_user(email, password_hash)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists",
            ) from exc
        return self._issue_token(record.id, record.email, record.created_at)

    def login(self, payload: LoginRequest) -> AuthTokenResponse:
        email = payload.email.strip().lower()
        record = self.repository.get_user_by_email(email)
        if not record or not verify_password(payload.password, record.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )
        return self._issue_token(record.id, record.email, record.created_at)

    def get_current_user(self, auth_header: str | None) -> User:
        token = parse_bearer_token(auth_header)
        user_id, email = decode_access_token(token, self.settings)
        record = self.repository.get_user_by_id(user_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )
        return User(id=record.id, email=record.email, created_at=record.created_at)

    def _issue_token(self, user_id: str, email: str, created_at) -> AuthTokenResponse:
        access_token = create_access_token(user_id=user_id, email=email, settings=self.settings)
        return AuthTokenResponse(
            access_token=access_token,
            user=User(id=user_id, email=email, created_at=created_at),
        )
