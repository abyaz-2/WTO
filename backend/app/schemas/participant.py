from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, StringConstraints
from typing_extensions import Annotated


class ParticipantCreate(BaseModel):
    user_id: UUID
    role: Annotated[str, StringConstraints(pattern=r"^(complainant|respondent|third_party)$")]

    class Config:
        from_attributes = True


class ParticipantUpdate(BaseModel):
    role: Annotated[str, StringConstraints(pattern=r"^(complainant|respondent|third_party)$")] | None = None

    class Config:
        from_attributes = True


class ParticipantRead(BaseModel):
    id: UUID
    issue_id: UUID
    user_id: UUID
    role: str
    status: str
    joined_at: datetime
    metadata: dict[str, Any] | None = None
    created_at: datetime

    class Config:
        from_attributes = True
