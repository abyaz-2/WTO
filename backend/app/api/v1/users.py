from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_eb_user, get_current_user, get_db
from app.models.user import User
from app.schemas.user import AdminUserCreate, UserRead, UserUpdate
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


@router.get("")
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = UserService(db)
    users = await service.list_users()
    return {"data": [UserRead.model_validate(u) for u in users], "error": None}


@router.post("")
async def create_user(
    data: AdminUserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_eb_user),
):
    service = UserService(db)
    user = await service.create_user(data)
    return {"data": UserRead.model_validate(user), "error": None}
