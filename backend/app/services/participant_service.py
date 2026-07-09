from __future__ import annotations

from datetime import datetime, timezone
from typing import Sequence
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from app.core.constants import IssueStatus, UserRole
from app.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from app.models.participant import Participant
from app.repositories.issue_repository import IssueRepository
from app.repositories.participant_repository import ParticipantRepository
from app.schemas.participant import ParticipantCreate, ParticipantUpdate

logger = get_logger()


class ParticipantService:
    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.participant_repo = ParticipantRepository(db_session)
        self.issue_repo = IssueRepository(db_session)

    async def register_participant(
        self, issue_id: UUID, user_id: UUID, role: str, actor_role: str
    ) -> Participant:
        issue = await self.issue_repo.get(issue_id)
        if not issue:
            raise NotFoundException("Issue", str(issue_id))

        if actor_role != UserRole.EXECUTIVE_BOARD.value:
            raise ForbiddenException("Only Executive Board members can register participants")

        if issue.current_status not in [
            IssueStatus.DRAFT.value,
            IssueStatus.REGISTRATION_OPEN.value,
        ]:
            raise ForbiddenException("Cannot register participants in current issue status")

        existing = await self.participant_repo.get_by_issue_and_user(issue_id, user_id)
        if existing and existing.status == "active":
            raise ConflictException("User is already a participant in this issue")

        if existing and existing.status in ("removed", "replaced"):
            return await self.participant_repo.update(
                existing.id,
                {"role": role, "status": "active", "joined_at": datetime.now(timezone.utc)},
            )

        participant_data = {
            "issue_id": issue_id,
            "user_id": user_id,
            "role": role,
            "status": "active",
            "joined_at": datetime.now(timezone.utc),
        }
        participant = await self.participant_repo.create(participant_data)

        logger.info(
            "participant_registered",
            issue_id=str(issue_id),
            user_id=str(user_id),
            role=role,
        )
        return participant

    async def remove_participant(
        self, issue_id: UUID, participant_id: UUID, actor_role: str
    ) -> None:
        if actor_role != UserRole.EXECUTIVE_BOARD.value:
            raise ForbiddenException("Only Executive Board members can remove participants")

        participant = await self.participant_repo.get(participant_id)
        if not participant or participant.issue_id != issue_id:
            raise NotFoundException("Participant", str(participant_id))

        await self.participant_repo.update(
            participant_id, {"status": "removed"}
        )

        logger.info(
            "participant_removed",
            issue_id=str(issue_id),
            participant_id=str(participant_id),
        )

    async def change_role(
        self,
        issue_id: UUID,
        participant_id: UUID,
        new_role: str,
        actor_role: str,
    ) -> Participant:
        if actor_role != UserRole.EXECUTIVE_BOARD.value:
            raise ForbiddenException("Only Executive Board members can change participant roles")

        participant = await self.participant_repo.get(participant_id)
        if not participant or participant.issue_id != issue_id:
            raise NotFoundException("Participant", str(participant_id))

        updated = await self.participant_repo.update(participant_id, {"role": new_role})
        if not updated:
            raise NotFoundException("Participant", str(participant_id))

        logger.info(
            "participant_role_changed",
            participant_id=str(participant_id),
            new_role=new_role,
        )
        return updated

    async def list_participants(self, issue_id: UUID) -> Sequence[Participant]:
        return await self.participant_repo.get_by_issue(issue_id)
