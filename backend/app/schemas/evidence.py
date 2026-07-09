from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, StringConstraints
from typing_extensions import Annotated


class EvidenceCreate(BaseModel):
    description: Annotated[str, StringConstraints(max_length=2000)] | None = None

    class Config:
        from_attributes = True


class EvidenceRead(BaseModel):
    id: UUID
    issue_id: UUID
    participant_id: UUID
    file_url: str
    file_type: str
    file_size: int
    description: str | None = None
    storage_path: str
    status: str
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
