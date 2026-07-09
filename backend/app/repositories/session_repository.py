from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import delete, select

from app.models.session import Session
from app.repositories.base import BaseRepository


class SessionRepository(BaseRepository[Session, dict, dict]):
    def __init__(self, db_session):
        super().__init__(Session, db_session)

    async def get_by_supabase_sid(self, supabase_sid: str) -> Optional[Session]:
        query = select(Session).where(Session.supabase_sid == supabase_sid)
        result = await self.db_session.execute(query)
        return result.scalar_one_or_none()

    async def get_active_by_user(self, user_id: UUID) -> Sequence[Session]:
        query = select(Session).where(
            Session.user_id == user_id,
            Session.expires_at > datetime.now(timezone.utc),
        )
        result = await self.db_session.execute(query)
        return result.scalars().all()

    async def delete_by_supabase_sid(self, supabase_sid: str) -> bool:
        stmt = delete(Session).where(Session.supabase_sid == supabase_sid)
        result = await self.db_session.execute(stmt)
        await self.db_session.flush()
        return result.rowcount > 0

    async def delete_expired(self) -> int:
        stmt = delete(Session).where(Session.expires_at <= datetime.now(timezone.utc))
        result = await self.db_session.execute(stmt)
        await self.db_session.flush()
        return result.rowcount
