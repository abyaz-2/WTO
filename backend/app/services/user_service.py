from __future__ import annotations

from typing import Any, Dict
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from app.core.exceptions import NotFoundException
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserUpdate

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
