from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from app.config import settings
from app.core.exceptions import ConflictException, UnauthorizedException
from app.core.security import extract_user_info, verify_supabase_jwt
from app.models.session import Session as SessionModel
from app.models.user import User
from app.repositories.session_repository import SessionRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate

logger = get_logger()


class AuthService:
    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.user_repo = UserRepository(db_session)
        self.session_repo = SessionRepository(db_session)

    async def signup(
        self,
        email: str,
        password: str,
        display_name: str,
        role: str,
    ) -> Dict[str, Any]:
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise ConflictException("A user with this email already exists")

        async with AsyncClient() as client:
            supabase_response = await client.post(
                f"{settings.SUPABASE_URL}/auth/v1/signup",
                headers={
                    "apikey": settings.SUPABASE_SERVICE_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "email": email,
                    "password": password,
                    "data": {"display_name": display_name, "role": role},
                },
            )

            if supabase_response.status_code not in (200, 201):
                error_detail = supabase_response.json()
                logger.error("supabase_signup_failed", detail=error_detail)
                raise Exception(
                    error_detail.get("msg", "Failed to create user with Supabase")
                )

            supabase_user = supabase_response.json().get("data", {}).get("user", supabase_response.json().get("user", {}))

        user_create = UserCreate(
            email=email,
            password=password,
            display_name=display_name,
            role=role,
        )
        user_data = user_create.model_dump(exclude={"password"})
        user_data["supabase_id"] = supabase_user.get("id", "")
        del user_data["email"]

        user = await self.user_repo.create(user_data)
        logger.info("user_created", user_id=str(user.id), email=email)

        return {"user_id": str(user.id), "email": email, "display_name": display_name, "role": role}

    async def login(self, email: str, password: str) -> Dict[str, Any]:
        async with AsyncClient() as client:
            supabase_response = await client.post(
                f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password",
                headers={
                    "apikey": settings.SUPABASE_SERVICE_KEY,
                    "Content-Type": "application/json",
                },
                json={"email": email, "password": password},
            )

            if supabase_response.status_code not in (200, 201):
                error_detail = supabase_response.json()
                logger.warning("supabase_login_failed", detail=error_detail)
                raise UnauthorizedException("Invalid email or password")

            auth_data = supabase_response.json()

        supabase_id = auth_data.get("user", {}).get("id", "")
        user = await self.user_repo.get_by_supabase_id(supabase_id)
        if not user:
            raise UnauthorizedException("User not found in platform database")

        access_token = auth_data.get("access_token", "")
        refresh_token = auth_data.get("refresh_token", "")

        payload = verify_supabase_jwt(access_token)

        supabase_sid = payload.get("session_id", "")
        now = datetime.now(timezone.utc)
        from datetime import timedelta
        expires_at = now + timedelta(hours=24)

        session_data = {
            "user_id": user.id,
            "supabase_sid": supabase_sid or access_token[:64],
            "last_active_at": now,
            "expires_at": expires_at,
            "created_at": now,
        }
        await self.session_repo.create(session_data)

        await self.user_repo.update(user.id, {"last_login_at": now})

        logger.info("user_logged_in", user_id=str(user.id))

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "display_name": user.display_name,
                "role": user.role,
            },
        }

    async def refresh(self, refresh_token: str) -> Dict[str, Any]:
        async with AsyncClient() as client:
            supabase_response = await client.post(
                f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token",
                headers={
                    "apikey": settings.SUPABASE_SERVICE_KEY,
                    "Content-Type": "application/json",
                },
                json={"refresh_token": refresh_token},
            )

            if supabase_response.status_code not in (200, 201):
                raise UnauthorizedException("Invalid refresh token")

            auth_data = supabase_response.json()

        return {
            "access_token": auth_data.get("access_token", ""),
            "refresh_token": auth_data.get("refresh_token", ""),
            "token_type": "bearer",
        }

    async def logout(self, access_token: str) -> None:
        try:
            payload = verify_supabase_jwt(access_token)
            supabase_sid = payload.get("session_id", "")

            if supabase_sid:
                await self.session_repo.delete_by_supabase_sid(supabase_sid)
        except Exception as exc:
            logger.warning("logout_cleanup_failed", error=str(exc))

        try:
            async with AsyncClient() as client:
                await client.post(
                    f"{settings.SUPABASE_URL}/auth/v1/logout",
                    headers={
                        "apikey": settings.SUPABASE_SERVICE_KEY,
                        "Authorization": f"Bearer {access_token}",
                    },
                )
        except Exception as exc:
            logger.warning("supabase_logout_failed", error=str(exc))

        logger.info("user_logged_out")

    async def verify_token(self, token: str) -> Dict[str, Any]:
        payload = verify_supabase_jwt(token)
        user_info = extract_user_info(payload)

        user = await self.user_repo.get_by_supabase_id(user_info["sub"])
        if not user:
            raise UnauthorizedException("User not found")

        return {
            "id": str(user.id),
            "email": user.email,
            "display_name": user.display_name,
            "role": user.role,
            "supabase_id": user_info["sub"],
        }
