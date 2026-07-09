from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.submission import SubmissionCreate, SubmissionRead, SubmissionUpdate
from app.services.submission_service import SubmissionService

router = APIRouter()


@router.get("")
async def list_submissions(
    issue_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SubmissionService(db)
    submissions = await service.list_submissions(
        issue_id=issue_id,
        user_id=current_user.id,
        user_role=current_user.role,
    )
    items = [SubmissionRead.model_validate(s) for s in submissions]
    return {"data": items, "error": None}


@router.post("")
async def create_submission(
    data: SubmissionCreate,
    issue_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.repositories.participant_repository import ParticipantRepository

    participant_repo = ParticipantRepository(db)
    participant = await participant_repo.get_by_issue_and_user(issue_id, current_user.id)
    if not participant:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("You are not a participant in this issue")

    service = SubmissionService(db)
    submission = await service.create_submission(
        issue_id=issue_id,
        participant_id=participant.id,
        submission_type=data.submission_type,
        content=data.content,
        user_id=current_user.id,
    )
    return {"data": SubmissionRead.model_validate(submission), "error": None}


@router.patch("/{submission_id}")
async def update_submission(
    data: SubmissionUpdate,
    issue_id: UUID = Path(...),
    submission_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SubmissionService(db)
    submission = await service.update_submission(
        issue_id=issue_id,
        submission_id=submission_id,
        data=data,
        user_id=current_user.id,
    )
    return {"data": SubmissionRead.model_validate(submission), "error": None}


@router.post("/{submission_id}/submit")
async def submit_submission(
    issue_id: UUID = Path(...),
    submission_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SubmissionService(db)
    submission = await service.submit_submission(
        issue_id=issue_id,
        submission_id=submission_id,
        user_id=current_user.id,
    )
    return {"data": SubmissionRead.model_validate(submission), "error": None}
