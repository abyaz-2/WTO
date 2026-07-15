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


PIPELINE_STAGES = [
    "collect", "normalize", "extract_facts", "retrieve_law",
    "analyze_claims", "draft_intro", "draft_factual",
    "draft_analysis", "draft_findings", "draft_recommendations",
]


@router.get("/{issue_id}/pipeline")
async def get_pipeline(
    issue_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IssueService(db)
    issue = await service.get_issue(issue_id)

    in_ai_phase = issue.current_status in ("ai_processing", "eb_review", "fact_checking", "final_revision", "final_published")

    stages = {}
    if in_ai_phase:
        completed_count = 0
        if issue.current_status == "ai_processing":
            for stage in PIPELINE_STAGES:
                stages[stage] = "running"
            stages[PIPELINE_STAGES[0]] = "completed"
        elif issue.current_status == "eb_review":
            for stage in PIPELINE_STAGES:
                stages[stage] = "completed"
            completed_count = len(PIPELINE_STAGES)
        elif issue.current_status in ("fact_checking", "final_revision", "final_published"):
            for stage in PIPELINE_STAGES:
                stages[stage] = "completed"
            completed_count = len(PIPELINE_STAGES)
        else:
            for stage in PIPELINE_STAGES:
                stages[stage] = "pending"
    else:
        for stage in PIPELINE_STAGES:
            stages[stage] = "pending"

    progress = round((completed_count / len(PIPELINE_STAGES)) * 100) if in_ai_phase else 0

    from app.repositories.ai_report_repository import AIReportRepository
    report_repo = AIReportRepository(db)
    latest_report = await report_repo.get_latest_by_issue(issue_id)

    return {
        "data": {
            "stages": stages,
            "progress": progress,
            "token_usage": 0,
            "cost_estimate": 0,
            "estimated_time_remaining": 0,
            "report_id": str(latest_report.id) if latest_report else None,
        },
        "error": None,
    }
