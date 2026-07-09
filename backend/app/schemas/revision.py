from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class RevisionRead(BaseModel):
    id: UUID
    revisable_type: str
    revisable_id: UUID
    version: int
    changes: dict[str, Any] | None = None
    created_by: UUID | None = None
    reason: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True
