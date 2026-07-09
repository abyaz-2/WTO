from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.filters import FilterParams
from app.api.deps.pagination import PaginationParams
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.issue import IssueCreate, IssueRead, IssueTransition, IssueUpdate
from app.services.issue_service import IssueService

router = APIRouter()


@router.get("")
async def list_issues(
    pagination: PaginationParams = Depends(),
    filters: FilterParams = Depends(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IssueService(db)
    issues, total = await service.list_issues(
        page=pagination.page,
        per_page=pagination.per_page,
        status=filters.status,
        search=filters.search,
    )
    total_pages = max(1, (total + pagination.per_page - 1) // pagination.per_page)
    items = [IssueRead.model_validate(i) for i in issues]
    return {
        "data": PaginatedResponse(
            data=items,
            total=total,
            page=pagination.page,
            per_page=pagination.per_page,
            total_pages=total_pages,
        ),
        "error": None,
    }


@router.post("")
async def create_issue(
    data: IssueCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IssueService(db)
    issue = await service.create_issue(
        title=data.title,
        description=data.description,
        complainant_id=current_user.id,
        respondent_id=data.respondent_id,
    )
    return {"data": IssueRead.model_validate(issue), "error": None}


@router.get("/{issue_id}")
async def get_issue(
    issue_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IssueService(db)
    issue = await service.get_issue(issue_id)
    return {"data": IssueRead.model_validate(issue), "error": None}


@router.patch("/{issue_id}")
async def update_issue(
    data: IssueUpdate,
    issue_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IssueService(db)
    issue = await service.update_issue(issue_id, data, current_user.id)
    return {"data": IssueRead.model_validate(issue), "error": None}


@router.delete("/{issue_id}")
async def delete_issue(
    issue_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IssueService(db)
    await service.soft_delete_issue(issue_id, current_user.id)
    return {"data": {"message": "Issue deleted successfully"}, "error": None}


@router.post("/{issue_id}/submit")
async def submit_issue(
    issue_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IssueService(db)
    issue = await service.submit_issue(issue_id, current_user.id)
    return {"data": IssueRead.model_validate(issue), "error": None}


@router.post("/{issue_id}/transition")
async def transition_issue(
    transition: IssueTransition,
    issue_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IssueService(db)
    issue = await service.transition_status(
        issue_id, transition, current_user.id, current_user.role
    )
    return {"data": IssueRead.model_validate(issue), "error": None}
