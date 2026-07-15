from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.services.revision_service import RevisionService

router = APIRouter()


@router.get("/{revisable_type}/{revisable_id}")
async def list_revisions(
    revisable_type: str = Path(...),
    revisable_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RevisionService(db)
    revisions = await service.list_revisions(revisable_type, revisable_id)

    items = [
        {
            "id": str(r.id),
            "revision_number": r.version,
            "changes": r.changes or {},
            "created_by": str(r.created_by) if r.created_by else None,
            "reason": r.reason,
            "created_at": r.created_at.isoformat() if r.created_at else "",
        }
        for r in revisions
    ]

    return {"data": items, "error": None}
