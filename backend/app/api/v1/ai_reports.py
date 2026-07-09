from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.ai_report import AIReportRead
from app.services.ai_report_service import AIReportService

router = APIRouter()


@router.get("")
async def list_ai_reports(
    issue_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AIReportService(db)
    reports = await service.list_reports(issue_id)
    items = [AIReportRead.model_validate(r) for r in reports]
    return {"data": items, "error": None}


@router.get("/{report_id}")
async def get_ai_report(
    issue_id: UUID = Path(...),
    report_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AIReportService(db)
    report = await service.get_report(report_id)
    return {"data": AIReportRead.model_validate(report), "error": None}


@router.post("/generate")
async def generate_ai_report(
    issue_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AIReportService(db)
    report = await service.generate_report(issue_id, current_user.id)
    return {"data": AIReportRead.model_validate(report), "error": None}
