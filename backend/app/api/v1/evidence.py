from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Path, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.evidence import EvidenceRead
from app.services.evidence_service import EvidenceService

router = APIRouter()


@router.get("")
async def list_evidence(
    issue_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = EvidenceService(db)
    evidence_list = await service.list_evidence(issue_id)
    items = [EvidenceRead.model_validate(e) for e in evidence_list]
    return {"data": items, "error": None}


@router.post("")
async def upload_evidence(
    file: UploadFile = File(...),
    description: str = Form(None),
    issue_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = EvidenceService(db)
    evidence = await service.upload_evidence(
        issue_id=issue_id,
        file=file,
        description=description,
        user_id=current_user.id,
    )
    return {"data": EvidenceRead.model_validate(evidence), "error": None}


@router.delete("/{evidence_id}")
async def delete_evidence(
    issue_id: UUID = Path(...),
    evidence_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = EvidenceService(db)
    await service.delete_evidence(
        issue_id=issue_id,
        evidence_id=evidence_id,
        user_id=current_user.id,
        user_role=current_user.role,
    )
    return {"data": {"message": "Evidence deleted successfully"}, "error": None}
