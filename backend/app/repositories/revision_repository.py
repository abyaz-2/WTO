from __future__ import annotations

from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import select

from app.models.revision import Revision
from app.repositories.base import BaseRepository
from app.schemas.revision import RevisionRead


class RevisionRepository(BaseRepository[Revision, RevisionRead, RevisionRead]):
    def __init__(self, db_session):
        super().__init__(Revision, db_session)

    async def get_by_revisable(
        self, revisable_type: str, revisable_id: UUID
    ) -> Sequence[Revision]:
        query = select(Revision).where(
            Revision.revisable_type == revisable_type,
            Revision.revisable_id == revisable_id,
            Revision.is_deleted == False,
        ).order_by(Revision.version.desc())
        result = await self.db_session.execute(query)
        return result.scalars().all()

    async def get_latest_by_revisable(
        self, revisable_type: str, revisable_id: UUID
    ) -> Optional[Revision]:
        query = select(Revision).where(
            Revision.revisable_type == revisable_type,
            Revision.revisable_id == revisable_id,
            Revision.is_deleted == False,
        ).order_by(Revision.version.desc()).limit(1)
        result = await self.db_session.execute(query)
        return result.scalar_one_or_none()

    async def get_next_version(self, revisable_type: str, revisable_id: UUID) -> int:
        from sqlalchemy import func
        query = select(func.coalesce(func.max(Revision.version), 0)).where(
            Revision.revisable_type == revisable_type,
            Revision.revisable_id == revisable_id,
            Revision.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        max_version = result.scalar_one()
        return (max_version or 0) + 1
