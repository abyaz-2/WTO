from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate
from app.services.user_service import UserService

router = APIRouter()


@router.get("/me")
async def get_me(
    current_user: User = Depends(get_current_user),
):
    user_data = UserRead.model_validate(current_user)
    return {"data": user_data, "error": None}


@router.patch("/me")
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = UserService(db)
    updated = await service.update_profile(current_user.id, data)
    return {"data": UserRead.model_validate(updated), "error": None}
