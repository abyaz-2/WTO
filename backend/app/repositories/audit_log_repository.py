from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict
from uuid import UUID

from app.models.audit_log import AuditLog
from app.repositories.base import BaseRepository


class AuditLogRepository(BaseRepository[AuditLog, Dict[str, Any], Dict[str, Any]]):
    def __init__(self, db_session):
        super().__init__(AuditLog, db_session)

    async def create_log(
        self,
        action: str,
        resource_type: str,
        resource_id: UUID | None = None,
        user_id: UUID | None = None,
        details: Dict[str, Any] | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AuditLog:
        log_data = {
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "user_id": user_id,
            "details": details or {},
            "ip_address": ip_address,
            "user_agent": user_agent,
            "created_at": datetime.now(timezone.utc),
        }
        return await self.create(log_data)
