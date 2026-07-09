from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional, Sequence
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from app.core.constants import IssueStatus, SubmissionStatus
from app.core.exceptions import ForbiddenException, NotFoundException, ValidationException
from app.models.submission import Submission
from app.repositories.issue_repository import IssueRepository
from app.repositories.participant_repository import ParticipantRepository
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.submission import SubmissionCreate, SubmissionUpdate

logger = get_logger()


class SubmissionService:
    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.submission_repo = SubmissionRepository(db_session)
        self.issue_repo = IssueRepository(db_session)
        self.participant_repo = ParticipantRepository(db_session)

    async def create_submission(
        self,
        issue_id: UUID,
        participant_id: UUID,
        submission_type: str,
        content: Optional[Dict[str, Any]],
        user_id: UUID,
    ) -> Submission:
        issue = await self.issue_repo.get(issue_id)
        if not issue:
            raise NotFoundException("Issue", str(issue_id))

        if issue.current_status not in [IssueStatus.SUBMISSION_PHASE.value, IssueStatus.EVIDENCE_PHASE.value]:
            raise ValidationException("Submissions can only be created during submission or evidence phase")

        participant = await self.participant_repo.get(participant_id)
        if not participant or participant.issue_id != issue_id:
            raise NotFoundException("Participant", str(participant_id))

        if participant.user_id != user_id:
            raise ForbiddenException("You can only create submissions for yourself")

        submission_data = {
            "issue_id": issue_id,
            "participant_id": participant_id,
            "submission_type": submission_type,
            "content": content or {},
            "status": SubmissionStatus.DRAFT.value,
        }
        submission = await self.submission_repo.create(submission_data)

        logger.info(
            "submission_created",
            submission_id=str(submission.id),
            issue_id=str(issue_id),
            submission_type=submission_type,
        )
        return submission

    async def update_submission(
        self,
        issue_id: UUID,
        submission_id: UUID,
        data: SubmissionUpdate,
        user_id: UUID,
    ) -> Submission:
        submission = await self.submission_repo.get(submission_id)
        if not submission or submission.issue_id != issue_id:
            raise NotFoundException("Submission", str(submission_id))

        participant = await self.participant_repo.get(submission.participant_id)
        if not participant or participant.user_id != user_id:
            raise ForbiddenException("You can only update your own submissions")

        if submission.status != SubmissionStatus.DRAFT.value:
            raise ValidationException("Can only update draft submissions")

        updated = await self.submission_repo.update(submission_id, data)
        if not updated:
            raise NotFoundException("Submission", str(submission_id))

        return updated

    async def submit_submission(
        self,
        issue_id: UUID,
        submission_id: UUID,
        user_id: UUID,
    ) -> Submission:
        submission = await self.submission_repo.get(submission_id)
        if not submission or submission.issue_id != issue_id:
            raise NotFoundException("Submission", str(submission_id))

        participant = await self.participant_repo.get(submission.participant_id)
        if not participant or participant.user_id != user_id:
            raise ForbiddenException("You can only submit your own submissions")

        if submission.status != SubmissionStatus.DRAFT.value:
            raise ValidationException("Submission is already submitted")

        updated = await self.submission_repo.update(
            submission_id,
            {
                "status": SubmissionStatus.SUBMITTED.value,
                "submitted_at": datetime.now(timezone.utc),
            },
        )
        if not updated:
            raise NotFoundException("Submission", str(submission_id))

        logger.info(
            "submission_submitted",
            submission_id=str(submission_id),
            issue_id=str(issue_id),
        )
        return updated

    async def list_submissions(
        self, issue_id: UUID, user_id: UUID, user_role: str
    ) -> Sequence[Submission]:
        from app.core.constants import UserRole
        if user_role == UserRole.EXECUTIVE_BOARD.value:
            return await self.submission_repo.get_by_issue(issue_id)

        participant = await self.participant_repo.get_by_issue_and_user(issue_id, user_id)
        if participant:
            return await self.submission_repo.get_by_participant(participant.id)

        return []
