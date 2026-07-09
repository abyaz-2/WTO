from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, StringConstraints
from typing_extensions import Annotated


class FactCheckCreate(BaseModel):
    status: Annotated[
        str, StringConstraints(pattern=r"^(pending|approved|correction_requested)$")
    ] | None = None
    comments: list[dict[str, Any]] | None = None

    class Config:
        from_attributes = True


class FactCheckUpdate(BaseModel):
    status: Annotated[
        str, StringConstraints(pattern=r"^(pending|approved|correction_requested)$")
    ] | None = None
    comments: list[dict[str, Any]] | None = None

    class Config:
        from_attributes = True


class FactCheckRead(BaseModel):
    id: UUID
    ai_report_id: UUID
    participant_id: UUID
    status: str
    comments: list[dict[str, Any]] | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
