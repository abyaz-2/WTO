from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.issue import Issue
from app.models.participant import Participant
from app.models.submission import Submission
from app.models.user import User
from app.repositories.issue_repository import IssueRepository
from app.repositories.participant_repository import ParticipantRepository

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    issue_repo = IssueRepository(db)
    participant_repo = ParticipantRepository(db)

    active_statuses = [
        "draft", "submitted", "under_review", "approved", "published",
        "registration_open", "registration_closed", "submission_phase",
        "evidence_phase", "ai_processing", "eb_review", "fact_checking",
        "final_revision",
    ]

    total_active = 0
    for status in active_statuses:
        issues = await issue_repo.get_by_status(status)
        total_active += len(issues)

    user_issues = await issue_repo.get_by_complainant(current_user.id)
    my_submissions_count = len(user_issues)

    pending_reviews_query = (
        select(func.count())
        .select_from(Participant)
        .join(Issue, Participant.issue_id == Issue.id)
        .where(
            Participant.user_id == current_user.id,
            Participant.status == "active",
            Issue.current_status.in_(["eb_review", "fact_checking", "final_revision"]),
        )
    )
    result = await db.execute(pending_reviews_query)
    pending_reviews = result.scalar_one()

    return {
        "data": {
            "active_issues": total_active,
            "my_submissions": my_submissions_count,
            "pending_reviews": pending_reviews,
        },
        "error": None,
    }
