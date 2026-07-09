from __future__ import annotations

from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import select

from app.models.fact_check import FactCheck
from app.repositories.base import BaseRepository
from app.schemas.fact_check import FactCheckCreate, FactCheckUpdate


class FactCheckRepository(BaseRepository[FactCheck, FactCheckCreate, FactCheckUpdate]):
    def __init__(self, db_session):
        super().__init__(FactCheck, db_session)

    async def get_by_ai_report(self, ai_report_id: UUID) -> Sequence[FactCheck]:
        query = select(FactCheck).where(
            FactCheck.ai_report_id == ai_report_id,
            FactCheck.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        return result.scalars().all()

    async def get_by_participant(self, participant_id: UUID) -> Sequence[FactCheck]:
        query = select(FactCheck).where(
            FactCheck.participant_id == participant_id,
            FactCheck.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        return result.scalars().all()

    async def get_by_report_and_participant(
        self, ai_report_id: UUID, participant_id: UUID
    ) -> Optional[FactCheck]:
        query = select(FactCheck).where(
            FactCheck.ai_report_id == ai_report_id,
            FactCheck.participant_id == participant_id,
            FactCheck.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_status(self, status: str) -> Sequence[FactCheck]:
        query = select(FactCheck).where(
            FactCheck.status == status,
            FactCheck.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        return result.scalars().all()
