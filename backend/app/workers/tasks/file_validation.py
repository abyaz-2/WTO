from __future__ import annotations

from typing import Any, Dict
from uuid import UUID

from structlog import get_logger

from app.core.constants import EvidenceStatus
from app.dependencies import async_session_factory
from app.repositories.evidence_repository import EvidenceRepository
from app.storage.validation import ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE

logger = get_logger()


async def validate_evidence_file(ctx: Dict[str, Any], evidence_id: str) -> Dict[str, Any]:
    logger.info(
        "file_validation_task_started",
        evidence_id=evidence_id,
    )

    async with async_session_factory() as session:
        try:
            repo = EvidenceRepository(session)
            evidence = await repo.get(UUID(evidence_id))

            if not evidence:
                logger.error("evidence_not_found", evidence_id=evidence_id)
                return {"status": "failed", "reason": "evidence_not_found"}

            is_valid = True
            rejection_reason = None

            import os
            ext = os.path.splitext(evidence.file_url or "")[1].lower()
            if ext and ext not in ALLOWED_EXTENSIONS:
                is_valid = False
                rejection_reason = f"Extension '{ext}' not allowed"

            if evidence.file_type and evidence.file_type not in ALLOWED_MIME_TYPES:
                is_valid = False
                rejection_reason = f"File type '{evidence.file_type}' not allowed"

            if evidence.file_size and evidence.file_size > MAX_FILE_SIZE:
                is_valid = False
                rejection_reason = "File exceeds maximum size"

            new_status = EvidenceStatus.VALIDATED.value if is_valid else EvidenceStatus.REJECTED.value
            await repo.update(UUID(evidence_id), {"status": new_status})

            logger.info(
                "file_validation_completed",
                evidence_id=evidence_id,
                status=new_status,
                reason=rejection_reason,
            )

            return {
                "status": new_status,
                "evidence_id": evidence_id,
                "reason": rejection_reason,
            }

        except Exception as exc:
            logger.error(
                "file_validation_failed",
                evidence_id=evidence_id,
                error=str(exc),
            )
            raise
