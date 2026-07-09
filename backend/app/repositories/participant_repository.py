from __future__ import annotations

from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import and_, select

from app.models.participant import Participant
from app.repositories.base import BaseRepository
from app.schemas.participant import ParticipantCreate, ParticipantRead


class ParticipantRepository(BaseRepository[Participant, ParticipantCreate, ParticipantRead]):
    def __init__(self, db_session):
        super().__init__(Participant, db_session)

    async def get_by_issue(self, issue_id: UUID) -> Sequence[Participant]:
        query = select(Participant).where(
            Participant.issue_id == issue_id,
            Participant.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        return result.scalars().all()

    async def get_by_issue_and_user(self, issue_id: UUID, user_id: UUID) -> Optional[Participant]:
        query = select(Participant).where(
            Participant.issue_id == issue_id,
            Participant.user_id == user_id,
            Participant.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        return result.scalar_one_or_none()

    async def get_active_by_issue(self, issue_id: UUID) -> Sequence[Participant]:
        query = select(Participant).where(
            Participant.issue_id == issue_id,
            Participant.status == "active",
            Participant.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        return result.scalars().all()

    async def get_by_role(self, issue_id: UUID, role: str) -> Sequence[Participant]:
        query = select(Participant).where(
            Participant.issue_id == issue_id,
            Participant.role == role,
            Participant.status == "active",
            Participant.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        return result.scalars().all()
