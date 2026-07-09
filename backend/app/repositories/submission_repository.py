from __future__ import annotations

from typing import Sequence
from uuid import UUID

from sqlalchemy import select

from app.models.submission import Submission
from app.repositories.base import BaseRepository
from app.schemas.submission import SubmissionCreate, SubmissionUpdate


class SubmissionRepository(BaseRepository[Submission, SubmissionCreate, SubmissionUpdate]):
    def __init__(self, db_session):
        super().__init__(Submission, db_session)

    async def get_by_issue(self, issue_id: UUID) -> Sequence[Submission]:
        query = select(Submission).where(
            Submission.issue_id == issue_id,
            Submission.is_deleted == False,
        ).order_by(Submission.created_at.desc())
        result = await self.db_session.execute(query)
        return result.scalars().all()

    async def get_by_participant(self, participant_id: UUID) -> Sequence[Submission]:
        query = select(Submission).where(
            Submission.participant_id == participant_id,
            Submission.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        return result.scalars().all()

    async def get_by_status(self, status: str) -> Sequence[Submission]:
        query = select(Submission).where(
            Submission.status == status,
            Submission.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        return result.scalars().all()

    async def get_by_type(self, issue_id: UUID, submission_type: str) -> Sequence[Submission]:
        query = select(Submission).where(
            Submission.issue_id == issue_id,
            Submission.submission_type == submission_type,
            Submission.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        return result.scalars().all()
