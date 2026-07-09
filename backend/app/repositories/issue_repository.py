from __future__ import annotations

from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import func, or_, select

from app.models.issue import Issue
from app.repositories.base import BaseRepository
from app.schemas.issue import IssueCreate, IssueUpdate


class IssueRepository(BaseRepository[Issue, IssueCreate, IssueUpdate]):
    def __init__(self, db_session):
        super().__init__(Issue, db_session)

    async def get_by_status(self, status: str) -> Sequence[Issue]:
        query = select(Issue).where(
            Issue.current_status == status,
            Issue.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        return result.scalars().all()

    async def get_by_complainant(self, complainant_id: UUID) -> Sequence[Issue]:
        query = select(Issue).where(
            Issue.complainant_id == complainant_id,
            Issue.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        return result.scalars().all()

    async def get_by_issue_number(self, issue_number: str) -> Optional[Issue]:
        query = select(Issue).where(
            Issue.issue_number == issue_number,
            Issue.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        return result.scalar_one_or_none()

    async def search_fts(self, search_term: str) -> Sequence[Issue]:
        query = select(Issue).where(
            or_(
                Issue.title.ilike(f"%{search_term}%"),
                Issue.description.ilike(f"%{search_term}%"),
                Issue.issue_number.ilike(f"%{search_term}%"),
            ),
            Issue.is_deleted == False,
        ).order_by(Issue.created_at.desc())
        result = await self.db_session.execute(query)
        return result.scalars().all()

    async def get_next_issue_number(self) -> str:
        query = select(func.count()).select_from(Issue).where(Issue.is_deleted == False)
        result = await self.db_session.execute(query)
        count = result.scalar_one()
        return f"WTO-{count + 1:04d}"

    async def update_status(self, id: UUID, new_status: str) -> Optional[Issue]:
        return await self.update(id, {"current_status": new_status})
