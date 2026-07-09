from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from app.core.constants import IssueStatus, UserRole
from app.core.exceptions import (
    ForbiddenException,
    InvalidTransitionException,
    NotFoundException,
    ValidationException,
)
from app.models.issue import Issue
from app.models.participant import Participant
from app.repositories.issue_repository import IssueRepository
from app.repositories.participant_repository import ParticipantRepository
from app.repositories.revision_repository import RevisionRepository
from app.schemas.issue import IssueCreate, IssueTransition, IssueUpdate

logger = get_logger()

VALID_TRANSITIONS: Dict[str, List[str]] = {
    "draft": ["submitted"],
    "submitted": ["under_review", "rejected"],
    "under_review": ["approved", "rejected", "draft"],
    "approved": ["published"],
    "published": ["registration_open"],
    "registration_open": ["registration_closed"],
    "registration_closed": ["submission_phase"],
    "submission_phase": ["evidence_phase"],
    "evidence_phase": ["ai_processing"],
    "ai_processing": ["eb_review"],
    "eb_review": ["fact_checking", "draft"],
    "fact_checking": ["final_revision", "eb_review"],
    "final_revision": ["final_published"],
    "final_published": ["archived"],
    "rejected": ["draft"],
}

TRANSITION_PERMISSIONS: Dict[str, str] = {
    "draft": "complainant",
    "submitted": "eb",
    "under_review": "eb",
    "approved": "eb",
    "published": "eb",
    "registration_open": "eb",
    "registration_closed": "eb",
    "submission_phase": "eb",
    "evidence_phase": "eb",
    "ai_processing": "system",
    "eb_review": "eb",
    "fact_checking": "eb",
    "final_revision": "eb",
    "final_published": "eb",
    "rejected": "eb",
    "archived": "eb",
}


class IssueService:
    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.issue_repo = IssueRepository(db_session)
        self.participant_repo = ParticipantRepository(db_session)
        self.revision_repo = RevisionRepository(db_session)

    async def create_issue(
        self,
        title: str,
        description: Optional[str],
        complainant_id: UUID,
        respondent_id: Optional[UUID] = None,
    ) -> Issue:
        issue_number = await self.issue_repo.get_next_issue_number()

        issue_data = {
            "issue_number": issue_number,
            "title": title,
            "description": description,
            "complainant_id": complainant_id,
            "current_status": IssueStatus.DRAFT.value,
            "timeline": [
                {
                    "status": IssueStatus.DRAFT.value,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "changed_by": str(complainant_id),
                }
            ],
        }
        issue = await self.issue_repo.create(issue_data)

        participant_data = {
            "issue_id": issue.id,
            "user_id": complainant_id,
            "role": "complainant",
            "status": "active",
            "joined_at": datetime.now(timezone.utc),
        }
        await self.participant_repo.create(participant_data)

        if respondent_id:
            respondent_data = {
                "issue_id": issue.id,
                "user_id": respondent_id,
                "role": "respondent",
                "status": "active",
                "joined_at": datetime.now(timezone.utc),
            }
            await self.participant_repo.create(respondent_data)

        logger.info(
            "issue_created",
            issue_id=str(issue.id),
            issue_number=issue_number,
            complainant_id=str(complainant_id),
        )
        return issue

    async def update_issue(self, issue_id: UUID, data: IssueUpdate, user_id: UUID) -> Issue:
        issue = await self.issue_repo.get(issue_id)
        if not issue:
            raise NotFoundException("Issue", str(issue_id))

        if issue.complainant_id != user_id:
            raise ForbiddenException("Only the complainant can update the issue")

        if issue.current_status != IssueStatus.DRAFT.value:
            raise ValidationException("Can only update issues in draft status")

        old_data = {"title": issue.title, "description": issue.description}
        updated = await self.issue_repo.update(issue_id, data)
        if not updated:
            raise NotFoundException("Issue", str(issue_id))

        changes = {}
        if data.title and data.title != old_data["title"]:
            changes["title"] = {"old": old_data["title"], "new": data.title}
        if data.description and data.description != old_data["description"]:
            changes["description"] = {"old": old_data["description"], "new": data.description}

        if changes:
            next_ver = await self.revision_repo.get_next_version("issue", issue_id)
            revision_data = {
                "revisable_type": "issue",
                "revisable_id": issue_id,
                "version": next_ver,
                "changes": changes,
                "created_by": user_id,
                "reason": "Issue updated",
            }
            await self.revision_repo.create(revision_data)

        return updated

    async def get_issue(self, issue_id: UUID) -> Issue:
        issue = await self.issue_repo.get(issue_id)
        if not issue:
            raise NotFoundException("Issue", str(issue_id))
        return issue

    async def list_issues(
        self,
        page: int = 1,
        per_page: int = 20,
        status: Optional[str] = None,
        search: Optional[str] = None,
        user_id: Optional[UUID] = None,
    ) -> tuple[Sequence[Issue], int]:
        filters = {}
        if status:
            filters["current_status"] = status

        extra_filters = []
        if user_id:
            from sqlalchemy import or_
            extra_filters.append(
                or_(
                    Issue.complainant_id == user_id,
                )
            )

        if search:
            issues, total = await self.issue_repo.get_many(
                page=page, per_page=per_page, filters=filters
            )
            if search.strip():
                issues = [i for i in issues if search.lower() in i.title.lower() or search.lower() in (i.description or "").lower()]
            total = len(issues)
            return issues, total

        return await self.issue_repo.get_many(
            page=page, per_page=per_page, filters=filters, extra_filters=extra_filters
        )

    async def submit_issue(self, issue_id: UUID, user_id: UUID) -> Issue:
        issue = await self.issue_repo.get(issue_id)
        if not issue:
            raise NotFoundException("Issue", str(issue_id))

        if issue.complainant_id != user_id:
            raise ForbiddenException("Only the complainant can submit the issue")

        return await self._transition(issue, IssueStatus.SUBMITTED.value, user_id, "Issue submitted")

    async def transition_status(
        self, issue_id: UUID, transition: IssueTransition, user_id: UUID, user_role: str
    ) -> Issue:
        issue = await self.issue_repo.get(issue_id)
        if not issue:
            raise NotFoundException("Issue", str(issue_id))

        self._check_transition_permission(
            issue.current_status, transition.target_status, user_role, user_id, issue
        )

        return await self._transition(
            issue, transition.target_status, user_id, transition.reason or "Status transition"
        )

    def _check_transition_permission(
        self,
        current_status: str,
        target_status: str,
        user_role: str,
        user_id: UUID,
        issue: Issue,
    ) -> None:
        required_permission = TRANSITION_PERMISSIONS.get(target_status, "eb")

        if required_permission == "complainant":
            if issue.complainant_id != user_id:
                raise ForbiddenException("Only the complainant can perform this transition")
        elif required_permission == "eb":
            if user_role != UserRole.EXECUTIVE_BOARD.value:
                raise ForbiddenException("Only Executive Board members can perform this transition")
        elif required_permission == "system":
            raise ForbiddenException("This transition can only be performed by the system")

    async def _transition(
        self, issue: Issue, target_status: str, changed_by: UUID, reason: str
    ) -> Issue:
        if target_status not in VALID_TRANSITIONS.get(issue.current_status, []):
            raise InvalidTransitionException(issue.current_status, target_status)

        timeline = issue.timeline or []
        timeline.append(
            {
                "status": target_status,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "reason": reason,
                "changed_by": str(changed_by),
            }
        )

        updated = await self.issue_repo.update(
            issue.id,
            {"current_status": target_status, "timeline": timeline},
        )
        if not updated:
            raise NotFoundException("Issue", str(issue.id))

        logger.info(
            "issue_transitioned",
            issue_id=str(issue.id),
            from_status=issue.current_status,
            to_status=target_status,
            changed_by=str(changed_by),
        )

        return updated

    async def soft_delete_issue(self, issue_id: UUID, user_id: UUID) -> None:
        issue = await self.issue_repo.get(issue_id)
        if not issue:
            raise NotFoundException("Issue", str(issue_id))

        deleted = await self.issue_repo.soft_delete(issue_id)
        if not deleted:
            raise NotFoundException("Issue", str(issue_id))

        logger.info("issue_deleted", issue_id=str(issue_id), user_id=str(user_id))
