from __future__ import annotations

from typing import Sequence
from uuid import UUID

from sqlalchemy import func, select

from app.models.notification import Notification
from app.repositories.base import BaseRepository
from app.schemas.notification import NotificationRead


class NotificationRepository(BaseRepository[Notification, NotificationRead, NotificationRead]):
    def __init__(self, db_session):
        super().__init__(Notification, db_session)

    async def get_by_user(self, user_id: UUID) -> Sequence[Notification]:
        query = select(Notification).where(
            Notification.user_id == user_id,
            Notification.is_deleted == False,
        ).order_by(Notification.created_at.desc())
        result = await self.db_session.execute(query)
        return result.scalars().all()

    async def get_unread_by_user(self, user_id: UUID) -> Sequence[Notification]:
        query = select(Notification).where(
            Notification.user_id == user_id,
            Notification.read_at.is_(None),
            Notification.is_deleted == False,
        ).order_by(Notification.created_at.desc())
        result = await self.db_session.execute(query)
        return result.scalars().all()

    async def count_unread(self, user_id: UUID) -> int:
        query = select(func.count()).select_from(Notification).where(
            Notification.user_id == user_id,
            Notification.read_at.is_(None),
            Notification.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        return result.scalar_one()

    async def mark_all_read(self, user_id: UUID) -> None:
        from datetime import datetime, timezone
        from sqlalchemy import update
        stmt = (
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.read_at.is_(None),
                Notification.is_deleted == False,
            )
            .values(read_at=datetime.now(timezone.utc))
        )
        await self.db_session.execute(stmt)
        await self.db_session.flush()
