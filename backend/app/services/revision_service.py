from __future__ import annotations

from typing import Any, Dict, List, Optional, Sequence
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from app.core.exceptions import NotFoundException
from app.models.revision import Revision
from app.repositories.revision_repository import RevisionRepository

logger = get_logger()


class RevisionService:
    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.revision_repo = RevisionRepository(db_session)

    async def create_revision(
        self,
        revisable_type: str,
        revisable_id: UUID,
        changes: Dict[str, Any],
        created_by: UUID,
        reason: Optional[str] = None,
    ) -> Revision:
        next_version = await self.revision_repo.get_next_version(revisable_type, revisable_id)

        revision_data = {
            "revisable_type": revisable_type,
            "revisable_id": revisable_id,
            "version": next_version,
            "changes": changes,
            "created_by": created_by,
            "reason": reason,
        }
        revision = await self.revision_repo.create(revision_data)

        logger.info(
            "revision_created",
            revision_id=str(revision.id),
            revisable_type=revisable_type,
            revisable_id=str(revisable_id),
            version=next_version,
        )
        return revision

    async def list_revisions(
        self, revisable_type: str, revisable_id: UUID
    ) -> Sequence[Revision]:
        return await self.revision_repo.get_by_revisable(revisable_type, revisable_id)

    async def get_diff(
        self, revisable_type: str, revisable_id: UUID, from_version: int, to_version: int
    ) -> Dict[str, Any]:
        revisions = await self.revision_repo.get_by_revisable(revisable_type, revisable_id)
        rev_map = {r.version: r for r in revisions}

        from_rev = rev_map.get(from_version)
        to_rev = rev_map.get(to_version)

        if not from_rev or not to_rev:
            raise NotFoundException("Revision version not found")

        return {
            "revisable_type": revisable_type,
            "revisable_id": str(revisable_id),
            "from_version": from_version,
            "to_version": to_version,
            "from_changes": from_rev.changes,
            "to_changes": to_rev.changes,
        }
