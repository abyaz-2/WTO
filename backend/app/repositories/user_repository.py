from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import select

from app.models.user import User
from app.repositories.base import BaseRepository
from app.schemas.user import UserCreate, UserUpdate


class UserRepository(BaseRepository[User, UserCreate, UserUpdate]):
    def __init__(self, db_session):
        super().__init__(User, db_session)

    async def get_by_email(self, email: str) -> Optional[User]:
        query = select(User).where(User.email == email, User.is_deleted == False)
        result = await self.db_session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_supabase_id(self, supabase_id: str) -> Optional[User]:
        query = select(User).where(User.supabase_id == supabase_id, User.is_deleted == False)
        result = await self.db_session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_role(self, role: str) -> list[User]:
        query = select(User).where(User.role == role, User.is_deleted == False)
        result = await self.db_session.execute(query)
        return list(result.scalars().all())
