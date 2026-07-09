from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.participant import ParticipantCreate, ParticipantRead, ParticipantUpdate
from app.services.participant_service import ParticipantService

router = APIRouter()


@router.get("")
async def list_participants(
    issue_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ParticipantService(db)
    participants = await service.list_participants(issue_id)
    items = [ParticipantRead.model_validate(p) for p in participants]
    return {"data": items, "error": None}


@router.post("")
async def add_participant(
    data: ParticipantCreate,
    issue_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ParticipantService(db)
    participant = await service.register_participant(
        issue_id=issue_id,
        user_id=data.user_id,
        role=data.role,
        actor_role=current_user.role,
    )
    return {"data": ParticipantRead.model_validate(participant), "error": None}


@router.patch("/{participant_id}")
async def update_participant(
    data: ParticipantUpdate,
    issue_id: UUID = Path(...),
    participant_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ParticipantService(db)
    participant = await service.change_role(
        issue_id=issue_id,
        participant_id=participant_id,
        new_role=data.role,
        actor_role=current_user.role,
    )
    return {"data": ParticipantRead.model_validate(participant), "error": None}


@router.delete("/{participant_id}")
async def remove_participant(
    issue_id: UUID = Path(...),
    participant_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ParticipantService(db)
    await service.remove_participant(
        issue_id=issue_id,
        participant_id=participant_id,
        actor_role=current_user.role,
    )
    return {"data": {"message": "Participant removed successfully"}, "error": None}
