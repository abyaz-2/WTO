from __future__ import annotations

from datetime import datetime, timezone
from typing import Sequence
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from app.core.constants import AIReportStatus, FactCheckStatus, UserRole
from app.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from app.models.fact_check import FactCheck
from app.repositories.ai_report_repository import AIReportRepository
from app.repositories.fact_check_repository import FactCheckRepository
from app.repositories.participant_repository import ParticipantRepository
from app.schemas.fact_check import FactCheckCreate, FactCheckUpdate

logger = get_logger()


class FactCheckService:
    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.fact_check_repo = FactCheckRepository(db_session)
        self.report_repo = AIReportRepository(db_session)
        self.participant_repo = ParticipantRepository(db_session)

    async def submit_fact_check(
        self,
        ai_report_id: UUID,
        participant_id: UUID,
        data: FactCheckCreate,
        user_id: UUID,
    ) -> FactCheck:
        report = await self.report_repo.get(ai_report_id)
        if not report:
            raise NotFoundException("AI Report", str(ai_report_id))

        if report.status not in [AIReportStatus.EB_REVIEW.value, AIReportStatus.FACT_CHECKING.value]:
            raise ForbiddenException("Fact checking is not open for this report")

        participant = await self.participant_repo.get(participant_id)
        if not participant or participant.user_id != user_id:
            raise ForbiddenException("You can only submit fact checks for yourself")

        existing = await self.fact_check_repo.get_by_report_and_participant(
            ai_report_id, participant_id
        )
        if existing:
            raise ConflictException("You have already submitted a fact check for this report")

        fact_check_data = {
            "ai_report_id": ai_report_id,
            "participant_id": participant_id,
            "status": data.status or FactCheckStatus.PENDING.value,
            "comments": data.comments or [],
        }
        fact_check = await self.fact_check_repo.create(fact_check_data)

        logger.info(
            "fact_check_submitted",
            fact_check_id=str(fact_check.id),
            report_id=str(ai_report_id),
        )
        return fact_check

    async def review_correction(
        self,
        fact_check_id: UUID,
        data: FactCheckUpdate,
        user_role: str,
    ) -> FactCheck:
        if user_role != UserRole.EXECUTIVE_BOARD.value:
            raise ForbiddenException("Only Executive Board members can review fact checks")

        fact_check = await self.fact_check_repo.get(fact_check_id)
        if not fact_check:
            raise NotFoundException("Fact Check", str(fact_check_id))

        update_dict = data.model_dump(exclude_unset=True)
        if data.status is not None:
            update_dict["status"] = data.status
            update_dict["reviewed_at"] = datetime.now(timezone.utc)

        updated = await self.fact_check_repo.update(fact_check_id, update_dict)
        if not updated:
            raise NotFoundException("Fact Check", str(fact_check_id))

        logger.info(
            "fact_check_reviewed",
            fact_check_id=str(fact_check_id),
            new_status=data.status,
        )
        return updated

    async def list_fact_checks(self, ai_report_id: UUID) -> Sequence[FactCheck]:
        report = await self.report_repo.get(ai_report_id)
        if not report:
            raise NotFoundException("AI Report", str(ai_report_id))
        return await self.fact_check_repo.get_by_ai_report(ai_report_id)
