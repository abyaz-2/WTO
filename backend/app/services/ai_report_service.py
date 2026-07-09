from __future__ import annotations

from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from app.core.constants import AIReportStatus, IssueStatus
from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.models.ai_report import AIReport
from app.repositories.ai_report_repository import AIReportRepository
from app.repositories.issue_repository import IssueRepository

logger = get_logger()


class AIReportService:
    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.report_repo = AIReportRepository(db_session)
        self.issue_repo = IssueRepository(db_session)

    async def generate_report(self, issue_id: UUID, user_id: UUID) -> AIReport:
        issue = await self.issue_repo.get(issue_id)
        if not issue:
            raise NotFoundException("Issue", str(issue_id))

        if issue.current_status not in [
            IssueStatus.AI_PROCESSING.value,
            IssueStatus.EB_REVIEW.value,
        ]:
            raise ValidationException(
                "Reports can only be generated during AI processing or EB review phase"
            )

        latest = await self.report_repo.get_latest_by_issue(issue_id)
        if latest and latest.status == AIReportStatus.GENERATING.value:
            raise ConflictException("A report is already being generated")

        next_version = await self.report_repo.get_next_version(issue_id)

        report_data = {
            "issue_id": issue_id,
            "version": next_version,
            "content": {},
            "confidence_score": None,
            "executive_summary": None,
            "status": AIReportStatus.GENERATING.value,
            "generated_by": user_id,
        }
        report = await self.report_repo.create(report_data)

        logger.info(
            "ai_report_generation_started",
            report_id=str(report.id),
            issue_id=str(issue_id),
            version=next_version,
        )

        return report

    async def get_report(self, report_id: UUID) -> AIReport:
        report = await self.report_repo.get(report_id)
        if not report:
            raise NotFoundException("AI Report", str(report_id))
        return report

    async def list_reports(self, issue_id: UUID) -> Sequence[AIReport]:
        return await self.report_repo.get_by_issue(issue_id)

    async def update_report_status(
        self, report_id: UUID, status: str, content: Optional[dict] = None
    ) -> AIReport:
        report = await self.report_repo.get(report_id)
        if not report:
            raise NotFoundException("AI Report", str(report_id))

        update_data = {"status": status}
        if content is not None:
            update_data["content"] = content

        updated = await self.report_repo.update(report_id, update_data)
        if not updated:
            raise NotFoundException("AI Report", str(report_id))

        return updated
