from __future__ import annotations

import secrets
import string
from typing import Any, Dict, List
from uuid import UUID

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from app.config import settings
from app.core.exceptions import ConflictException, NotFoundException
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import AdminUserCreate, UserUpdate

logger = get_logger()


class UserService:
    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.user_repo = UserRepository(db_session)

    async def get_profile(self, user_id: UUID) -> User:
        user = await self.user_repo.get(user_id)
        if not user:
            raise NotFoundException("User", str(user_id))
        return user

    async def update_profile(self, user_id: UUID, data: UserUpdate) -> User:
        user = await self.user_repo.get(user_id)
        if not user:
            raise NotFoundException("User", str(user_id))

        updated_user = await self.user_repo.update(user_id, data)
        if not updated_user:
            raise NotFoundException("User", str(user_id))

        logger.info("user_profile_updated", user_id=str(user_id))
        return updated_user

    async def list_users(self) -> List[User]:
        users, _ = await self.user_repo.get_many(page=1, per_page=1000)
        return list(users)

    async def create_user(self, data: AdminUserCreate) -> User:
        existing = await self.user_repo.get_by_email(data.email)
        if existing:
            raise ConflictException("A user with this email already exists")

        password = self._generate_temp_password()

        async with AsyncClient() as client:
            supabase_response = await client.post(
                f"{settings.SUPABASE_URL}/auth/v1/signup",
                headers={
                    "apikey": settings.SUPABASE_SERVICE_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "email": data.email,
                    "password": password,
                    "data": {"display_name": data.display_name, "role": data.role},
                },
            )

            if supabase_response.status_code not in (200, 201):
                error_detail = supabase_response.json()
                logger.error("supabase_signup_failed", detail=error_detail)
                raise Exception(
                    error_detail.get("msg", "Failed to create user in Supabase")
                )

            supabase_user = (
                supabase_response.json()
                .get("data", {})
                .get("user", supabase_response.json().get("user", {}))
            )

        user_data = {
            "email": data.email,
            "supabase_id": supabase_user.get("id", ""),
            "display_name": data.display_name,
            "role": data.role,
            "is_active": True,
        }
        user = await self.user_repo.create(user_data)

        logger.info(
            "admin_user_created",
            user_id=str(user.id),
            email=data.email,
            role=data.role,
        )

        return user

    def _generate_temp_password(self, length: int = 16) -> str:
        alphabet = string.ascii_letters + string.digits
        return "".join(secrets.choice(alphabet) for _ in range(length))
