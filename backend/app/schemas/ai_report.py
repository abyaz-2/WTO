from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class AIReportRead(BaseModel):
    id: UUID
    issue_id: UUID
    version: int
    content: dict[str, Any] | None = None
    confidence_score: float | None = None
    executive_summary: str | None = None
    status: str
    generated_by: UUID | None = None
    published_url: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class AIReportGenerate(BaseModel):
    pass
