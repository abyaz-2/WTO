from fastapi import APIRouter

from app.api.v1 import (
    health,
    auth,
    users,
    issues,
    participants,
    submissions,
    evidence,
    ai_reports,
    fact_checks,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(issues.router, prefix="/issues", tags=["Issues"])
api_router.include_router(participants.router, prefix="/issues/{issue_id}/participants", tags=["Participants"])
api_router.include_router(submissions.router, prefix="/issues/{issue_id}/submissions", tags=["Submissions"])
api_router.include_router(evidence.router, prefix="/issues/{issue_id}/evidence", tags=["Evidence"])
api_router.include_router(ai_reports.router, prefix="/issues/{issue_id}/ai-reports", tags=["AI Reports"])
api_router.include_router(fact_checks.router, prefix="/issues/{issue_id}/ai-reports/{report_id}/fact-checks", tags=["Fact Checks"])
