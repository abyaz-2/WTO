from __future__ import annotations

from typing import Any, Dict
from uuid import UUID

from structlog import get_logger

from app.dependencies import async_session_factory
from app.services.notification_service import NotificationService

logger = get_logger()


async def dispatch_notification(
    ctx: Dict[str, Any],
    user_id: str,
    notification_type: str,
    content: Dict[str, Any],
) -> Dict[str, Any]:
    logger.info(
        "notification_dispatch_task_started",
        user_id=user_id,
        notification_type=notification_type,
    )

    async with async_session_factory() as session:
        try:
            service = NotificationService(session)
            notification = await service.create_notification(
                user_id=UUID(user_id),
                notification_type=notification_type,
                content=content,
            )

            logger.info(
                "notification_dispatch_completed",
                notification_id=str(notification.id),
                user_id=user_id,
            )

            return {"status": "sent", "notification_id": str(notification.id)}

        except Exception as exc:
            logger.error(
                "notification_dispatch_failed",
                user_id=user_id,
                error=str(exc),
            )
            raise
