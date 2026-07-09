from __future__ import annotations

import uuid
from typing import Sequence
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from app.core.constants import IssueStatus, UserRole
from app.core.exceptions import ForbiddenException, NotFoundException, ValidationException
from app.models.evidence import Evidence
from app.repositories.evidence_repository import EvidenceRepository
from app.repositories.issue_repository import IssueRepository
from app.repositories.participant_repository import ParticipantRepository
from app.services.storage_service import StorageService
from app.storage.validation import validate_file

logger = get_logger()


class EvidenceService:
    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.evidence_repo = EvidenceRepository(db_session)
        self.issue_repo = IssueRepository(db_session)
        self.participant_repo = ParticipantRepository(db_session)
        self.storage_service = StorageService(db_session)

    async def upload_evidence(
        self,
        issue_id: UUID,
        file: UploadFile,
        description: str | None,
        user_id: UUID,
    ) -> Evidence:
        issue = await self.issue_repo.get(issue_id)
        if not issue:
            raise NotFoundException("Issue", str(issue_id))

        if issue.current_status != IssueStatus.EVIDENCE_PHASE.value:
            raise ValidationException("Evidence can only be uploaded during evidence phase")

        participant = await self.participant_repo.get_by_issue_and_user(issue_id, user_id)
        if not participant or participant.status != "active":
            raise ForbiddenException("You are not an active participant in this issue")

        file_content = await file.read()
        validation_result = validate_file(file.filename or "file", file.content_type or "", len(file_content))
        if validation_result:
            raise ValidationException(validation_result)

        storage_path = f"issues/{issue_id}/evidence/{uuid.uuid4()}_{file.filename}"
        file_url = await self.storage_service.upload_file(
            bucket="evidence",
            storage_path=storage_path,
            file_content=file_content,
            content_type=file.content_type or "application/octet-stream",
        )

        evidence_data = {
            "issue_id": issue_id,
            "participant_id": participant.id,
            "file_url": file_url,
            "file_type": file.content_type or "application/octet-stream",
            "file_size": len(file_content),
            "description": description,
            "storage_path": storage_path,
            "status": "pending",
        }
        evidence = await self.evidence_repo.create(evidence_data)

        logger.info(
            "evidence_uploaded",
            evidence_id=str(evidence.id),
            issue_id=str(issue_id),
            file_size=len(file_content),
        )
        return evidence

    async def get_signed_url(self, evidence_id: UUID, user_id: UUID) -> str:
        evidence = await self.evidence_repo.get(evidence_id)
        if not evidence:
            raise NotFoundException("Evidence", str(evidence_id))

        participant = await self.participant_repo.get_by_issue_and_user(evidence.issue_id, user_id)
        if not participant:
            raise ForbiddenException("You are not a participant in this issue")

        return await self.storage_service.get_signed_url(
            bucket="evidence",
            storage_path=evidence.storage_path,
        )

    async def delete_evidence(
        self,
        issue_id: UUID,
        evidence_id: UUID,
        user_id: UUID,
        user_role: str,
    ) -> None:
        evidence = await self.evidence_repo.get(evidence_id)
        if not evidence or evidence.issue_id != issue_id:
            raise NotFoundException("Evidence", str(evidence_id))

        participant = await self.participant_repo.get(evidence.participant_id)
        is_owner = participant and participant.user_id == user_id
        is_eb = user_role == UserRole.EXECUTIVE_BOARD.value

        if not is_owner and not is_eb:
            raise ForbiddenException("You can only delete your own evidence")

        await self.storage_service.delete_file(bucket="evidence", storage_path=evidence.storage_path)
        await self.evidence_repo.soft_delete(evidence_id)

        logger.info("evidence_deleted", evidence_id=str(evidence_id))

    async def list_evidence(self, issue_id: UUID) -> Sequence[Evidence]:
        return await self.evidence_repo.get_by_issue(issue_id)
