from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.participant import Participant
from app.models.user import User
from app.schemas.ai_report import AIReportRead
from app.services.ai_report_service import AIReportService
from app.services.fact_check_service import FactCheckService

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


@router.get("/{report_id}/review/status")
async def get_report_review_status(
    issue_id: UUID = Path(...),
    report_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AIReportService(db)
    report = await service.get_report(report_id)

    fact_check_service = FactCheckService(db)
    fact_checks = await fact_check_service.list_fact_checks(report_id)

    from app.repositories.participant_repository import ParticipantRepository
    participant_repo = ParticipantRepository(db)
    participants = await participant_repo.get_active_by_issue(issue_id)

    from app.repositories.user_repository import UserRepository
    user_repo = UserRepository(db)
    users_map = {}
    for p in participants:
        if p.user_id not in users_map:
            u = await user_repo.get(p.user_id)
            if u:
                users_map[p.user_id] = u

    fc_by_participant = {fc.participant_id: fc for fc in fact_checks}

    parties = []
    user_party = ""
    for p in participants:
        fc = fc_by_participant.get(p.id)
        status = "pending"
        submitted_at = None
        if fc:
            if fc.status == "approved":
                status = "approved"
            elif fc.status == "correction_requested":
                status = "correction_requested"
            else:
                status = "pending"
            submitted_at = fc.created_at.isoformat() if fc.created_at else None

        party_name = users_map[p.user_id].display_name if p.user_id in users_map else str(p.user_id)
        parties.append({
            "party": party_name,
            "role": p.role,
            "status": status,
            "submitted_at": submitted_at,
        })

        if p.user_id == current_user.id:
            user_party = p.role

    return {
        "data": {
            "parties": parties,
            "userParty": user_party,
            "deadline": report.meta_data.get("review_deadline", "") if report.meta_data else "",
            "report_id": str(report_id),
            "issue_id": str(issue_id),
            "status": report.status,
        },
        "error": None,
    }


@router.post("/{report_id}/review/approve")
async def approve_report(
    issue_id: UUID = Path(...),
    report_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.repositories.participant_repository import ParticipantRepository
    participant_repo = ParticipantRepository(db)
    participant = await participant_repo.get_by_issue_and_user(issue_id, current_user.id)

    from app.core.exceptions import ForbiddenException
    if not participant:
        raise ForbiddenException("You are not a participant in this issue")

    fact_check_service = FactCheckService(db)
    from app.schemas.fact_check import FactCheckCreate
    fact_check = await fact_check_service.submit_fact_check(
        ai_report_id=report_id,
        participant_id=participant.id,
        data=FactCheckCreate(status="approved"),
        user_id=current_user.id,
    )

    return {
        "data": {
            "approved": True,
            "approvedAt": fact_check.created_at.isoformat() if fact_check.created_at else "",
            "message": "Report approved successfully",
        },
        "error": None,
    }


@router.get("/{report_id}/published")
async def get_published_report(
    issue_id: UUID = Path(...),
    report_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AIReportService(db)
    report = await service.get_report(report_id)

    content = report.content or {}
    sections = content.get("sections", [])
    executive_summary = report.executive_summary or content.get("executive_summary", "")

    report_data = {
        "id": str(report.id),
        "issue_id": str(report.issue_id),
        "version": report.version,
        "status": report.status,
        "sections": sections,
        "confidence": {
            "overall": float(report.confidence_score) if report.confidence_score else 0,
            "dimensions": content.get("confidence_dimensions", {}),
            "per_section": content.get("confidence_per_section", []),
        },
        "executive_summary": executive_summary,
        "metadata": report.meta_data or {},
        "created_at": report.created_at.isoformat() if report.created_at else "",
        "updated_at": report.updated_at.isoformat() if report.updated_at else "",
        "created_by": str(report.generated_by) if report.generated_by else "",
    }

    meta = report.meta_data or {}
    published_info = {
        "publicationDate": meta.get("publication_date", report.updated_at.isoformat() if report.updated_at else ""),
        "panelMembers": meta.get("panel_members", []),
        "sha256Hash": meta.get("sha256_hash", ""),
        "certificateNumber": meta.get("certificate_number", ""),
    }

    return {
        "data": {
            "report": report_data,
            "publishedInfo": published_info,
        },
        "error": None,
    }
