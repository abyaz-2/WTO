from __future__ import annotations

from typing import Any, Dict, Sequence
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from app.core.exceptions import NotFoundException
from app.models.notification import Notification
from app.repositories.notification_repository import NotificationRepository

logger = get_logger()


class NotificationService:
    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.notification_repo = NotificationRepository(db_session)

    async def create_notification(
        self,
        user_id: UUID,
        notification_type: str,
        content: Dict[str, Any],
    ) -> Notification:
        notification_data = {
            "user_id": user_id,
            "type": notification_type,
            "content": content,
        }
        notification = await self.notification_repo.create(notification_data)

        logger.info(
            "notification_created",
            notification_id=str(notification.id),
            user_id=str(user_id),
            type=notification_type,
        )
        return notification

    async def mark_read(self, notification_id: UUID, user_id: UUID) -> Notification:
        notification = await self.notification_repo.get(notification_id)
        if not notification:
            raise NotFoundException("Notification", str(notification_id))

        if notification.user_id != user_id:
            raise NotFoundException("Notification", str(notification_id))

        from datetime import datetime, timezone
        updated = await self.notification_repo.update(
            notification_id,
            {"read_at": datetime.now(timezone.utc)},
        )
        if not updated:
            raise NotFoundException("Notification", str(notification_id))

        return updated

    async def mark_all_read(self, user_id: UUID) -> None:
        await self.notification_repo.mark_all_read(user_id)
        logger.info("all_notifications_marked_read", user_id=str(user_id))

    async def list_notifications(self, user_id: UUID) -> Sequence[Notification]:
        return await self.notification_repo.get_by_user(user_id)

    async def count_unread(self, user_id: UUID) -> int:
        return await self.notification_repo.count_unread(user_id)
