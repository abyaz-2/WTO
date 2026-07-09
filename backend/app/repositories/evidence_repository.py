from __future__ import annotations

from typing import Sequence
from uuid import UUID

from sqlalchemy import select

from app.models.evidence import Evidence
from app.repositories.base import BaseRepository
from app.schemas.evidence import EvidenceCreate, EvidenceRead


class EvidenceRepository(BaseRepository[Evidence, EvidenceCreate, EvidenceRead]):
    def __init__(self, db_session):
        super().__init__(Evidence, db_session)

    async def get_by_issue(self, issue_id: UUID) -> Sequence[Evidence]:
        query = select(Evidence).where(
            Evidence.issue_id == issue_id,
            Evidence.is_deleted == False,
        ).order_by(Evidence.created_at.desc())
        result = await self.db_session.execute(query)
        return result.scalars().all()

    async def get_by_participant(self, participant_id: UUID) -> Sequence[Evidence]:
        query = select(Evidence).where(
            Evidence.participant_id == participant_id,
            Evidence.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        return result.scalars().all()

    async def get_by_status(self, status: str) -> Sequence[Evidence]:
        query = select(Evidence).where(
            Evidence.status == status,
            Evidence.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        return result.scalars().all()

    async def get_by_storage_path(self, storage_path: str):
        query = select(Evidence).where(
            Evidence.storage_path == storage_path,
            Evidence.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        return result.scalar_one_or_none()
