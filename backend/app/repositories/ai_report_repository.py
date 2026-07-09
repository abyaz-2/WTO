from __future__ import annotations

from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import select

from app.models.ai_report import AIReport
from app.repositories.base import BaseRepository
from app.schemas.ai_report import AIReportRead


class AIReportRepository(BaseRepository[AIReport, AIReportRead, AIReportRead]):
    def __init__(self, db_session):
        super().__init__(AIReport, db_session)

    async def get_by_issue(self, issue_id: UUID) -> Sequence[AIReport]:
        query = select(AIReport).where(
            AIReport.issue_id == issue_id,
            AIReport.is_deleted == False,
        ).order_by(AIReport.version.desc())
        result = await self.db_session.execute(query)
        return result.scalars().all()

    async def get_latest_by_issue(self, issue_id: UUID) -> Optional[AIReport]:
        query = select(AIReport).where(
            AIReport.issue_id == issue_id,
            AIReport.is_deleted == False,
        ).order_by(AIReport.version.desc()).limit(1)
        result = await self.db_session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_status(self, status: str) -> Sequence[AIReport]:
        query = select(AIReport).where(
            AIReport.status == status,
            AIReport.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        return result.scalars().all()

    async def get_next_version(self, issue_id: UUID) -> int:
        from sqlalchemy import func
        query = select(func.coalesce(func.max(AIReport.version), 0)).where(
            AIReport.issue_id == issue_id,
            AIReport.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        max_version = result.scalar_one()
        return (max_version or 0) + 1
