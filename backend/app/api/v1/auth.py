from __future__ import annotations

from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel, EmailStr, StringConstraints
from sqlalchemy.ext.asyncio import AsyncSession
from typing_extensions import Annotated

from app.dependencies import get_db
from app.services.auth_service import AuthService

router = APIRouter()


class SignupRequest(BaseModel):
    email: Annotated[str, StringConstraints(max_length=255)]
    password: Annotated[str, StringConstraints(min_length=8, max_length=128)]
    display_name: Annotated[str, StringConstraints(min_length=1, max_length=255)]
    role: Annotated[str, StringConstraints(pattern=r"^(executive_board|delegate)$")]


class LoginRequest(BaseModel):
    email: Annotated[str, StringConstraints(max_length=255)]
    password: Annotated[str, StringConstraints(min_length=1)]


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/signup")
async def signup(
    request: SignupRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    result = await service.signup(
        email=request.email,
        password=request.password,
        display_name=request.display_name,
        role=request.role,
    )
    return {"data": result, "error": None}


@router.post("/login")
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    result = await service.login(
        email=request.email,
        password=request.password,
    )
    return {"data": result, "error": None}


@router.post("/refresh")
async def refresh(
    request: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    result = await service.refresh(refresh_token=request.refresh_token)
    return {"data": result, "error": None}


@router.post("/logout")
async def logout(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    token = ""
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer":
            token = ""

    service = AuthService(db)
    await service.logout(access_token=token)
    return {"data": {"message": "Logged out successfully"}, "error": None}
