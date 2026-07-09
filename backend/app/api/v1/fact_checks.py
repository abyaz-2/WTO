from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.fact_check import FactCheckCreate, FactCheckRead, FactCheckUpdate
from app.services.fact_check_service import FactCheckService

router = APIRouter()


@router.get("")
async def list_fact_checks(
    issue_id: UUID = Path(...),
    report_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = FactCheckService(db)
    fact_checks = await service.list_fact_checks(report_id)
    items = [FactCheckRead.model_validate(fc) for fc in fact_checks]
    return {"data": items, "error": None}


@router.post("")
async def create_fact_check(
    data: FactCheckCreate,
    issue_id: UUID = Path(...),
    report_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.repositories.participant_repository import ParticipantRepository
    participant_repo = ParticipantRepository(db)
    participant = await participant_repo.get_by_issue_and_user(issue_id, current_user.id)
    if not participant:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("You are not a participant in this issue")

    service = FactCheckService(db)
    fact_check = await service.submit_fact_check(
        ai_report_id=report_id,
        participant_id=participant.id,
        data=data,
        user_id=current_user.id,
    )
    return {"data": FactCheckRead.model_validate(fact_check), "error": None}


@router.patch("/{fact_check_id}")
async def update_fact_check(
    data: FactCheckUpdate,
    issue_id: UUID = Path(...),
    report_id: UUID = Path(...),
    fact_check_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = FactCheckService(db)
    fact_check = await service.review_correction(
        fact_check_id=fact_check_id,
        data=data,
        user_role=current_user.role,
    )
    return {"data": FactCheckRead.model_validate(fact_check), "error": None}
