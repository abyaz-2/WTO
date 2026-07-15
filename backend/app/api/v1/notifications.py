from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.services.notification_service import NotificationService

router = APIRouter()


@router.get("")
async def list_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    unread: bool | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    notifications, total = await service.list_notifications_paginated(
        user_id=current_user.id,
        page=page,
        per_page=per_page,
        unread_only=unread or False,
    )
    unread_count = await service.count_unread(current_user.id)
    total_pages = max(1, (total + per_page - 1) // per_page)

    items = []
    for n in notifications:
        content = n.content or {}
        items.append({
            "id": str(n.id),
            "type": n.type,
            "title": content.get("title", ""),
            "body": content.get("body", ""),
            "link": content.get("link", ""),
            "read": n.read_at is not None,
            "created_at": n.created_at.isoformat() if n.created_at else "",
        })

    return {
        "data": {
            "notifications": items,
            "total": total,
            "unreadCount": unread_count,
            "page": page,
            "totalPages": total_pages,
        },
        "error": None,
    }


@router.post("/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    await service.mark_all_read(current_user.id)
    return {"data": {"success": True}, "error": None}


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    await service.mark_read(notification_id, current_user.id)
    return {"data": {"success": True}, "error": None}
