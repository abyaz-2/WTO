from __future__ import annotations

from typing import Any, Dict
from uuid import UUID

from structlog import get_logger

from app.core.constants import AIReportStatus
from app.dependencies import async_session_factory
from app.services.ai_report_service import AIReportService

logger = get_logger()


async def generate_ai_report(ctx: Dict[str, Any], report_id: str, issue_id: str) -> Dict[str, Any]:
    logger.info(
        "ai_generation_task_started",
        report_id=report_id,
        issue_id=issue_id,
    )

    async with async_session_factory() as session:
        try:
            service = AIReportService(session)

            await service.update_report_status(
                report_id=UUID(report_id),
                status=AIReportStatus.GENERATING.value,
            )

            report = await service.get_report(UUID(report_id))

            generated_content = {
                "analysis": "AI analysis pending implementation",
                "findings": [],
                "recommendations": [],
                "legal_analysis": "Legal analysis pending implementation",
            }

            await service.update_report_status(
                report_id=UUID(report_id),
                status=AIReportStatus.DRAFT.value,
                content=generated_content,
            )

            logger.info(
                "ai_generation_task_completed",
                report_id=report_id,
            )

            return {"status": "completed", "report_id": report_id}

        except Exception as exc:
            logger.error(
                "ai_generation_task_failed",
                report_id=report_id,
                error=str(exc),
            )
            try:
                await service.update_report_status(
                    report_id=UUID(report_id),
                    status=AIReportStatus.DRAFT.value,
                )
            except Exception:
                pass
            raise
