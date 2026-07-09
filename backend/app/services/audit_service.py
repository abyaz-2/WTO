from __future__ import annotations

from typing import Any, Dict, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from app.repositories.audit_log_repository import AuditLogRepository

logger = get_logger()


class AuditService:
    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.audit_repo = AuditLogRepository(db_session)

    async def log_action(
        self,
        action: str,
        resource_type: str,
        resource_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        await self.audit_repo.create_log(
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            user_id=user_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        logger.info(
            "audit_log_created",
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            user_id=str(user_id) if user_id else None,
        )
