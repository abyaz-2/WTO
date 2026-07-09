from __future__ import annotations

from fastapi import Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User


async def get_current_user_dep(
    request: Request,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    return await get_current_user(request, authorization, db)
