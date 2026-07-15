from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, StringConstraints, field_validator
from typing_extensions import Annotated


class UserCreate(BaseModel):
    email: Annotated[str, StringConstraints(max_length=255)]
    password: Annotated[str, StringConstraints(min_length=8, max_length=128)]
    display_name: Annotated[str, StringConstraints(min_length=1, max_length=255)]
    role: Annotated[str, StringConstraints(pattern=r"^(executive_board|delegate)$")]

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v

    class Config:
        from_attributes = True


class AdminUserCreate(BaseModel):
    email: Annotated[str, StringConstraints(max_length=255)]
    display_name: Annotated[str, StringConstraints(min_length=1, max_length=255)]
    role: Annotated[str, StringConstraints(pattern=r"^(executive_board|delegate)$")]

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    display_name: Annotated[str, StringConstraints(min_length=1, max_length=255)] | None = None
    avatar_url: Annotated[str, StringConstraints(max_length=1024)] | None = None

    class Config:
        from_attributes = True


class UserRead(BaseModel):
    id: UUID
    email: str
    display_name: str
    avatar_url: str | None = None
    role: str
    is_active: bool
    last_login_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True
