from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, StringConstraints, field_validator
from typing_extensions import Annotated

from app.schemas.participant import ParticipantRead


class IssueCreate(BaseModel):
    title: Annotated[str, StringConstraints(min_length=1, max_length=500)]
    description: Annotated[str, StringConstraints(max_length=10000)] | None = None
    respondent_id: UUID | None = None

    class Config:
        from_attributes = True


class IssueUpdate(BaseModel):
    title: Annotated[str, StringConstraints(min_length=1, max_length=500)] | None = None
    description: Annotated[str, StringConstraints(max_length=10000)] | None = None

    class Config:
        from_attributes = True


class IssueTransition(BaseModel):
    target_status: Annotated[str, StringConstraints(min_length=1, max_length=50)]
    reason: Annotated[str, StringConstraints(max_length=500)] | None = None

    class Config:
        from_attributes = True


class TimelineEntry(BaseModel):
    status: str
    timestamp: datetime
    reason: str | None = None
    changed_by: UUID | None = None

    class Config:
        from_attributes = True


class IssueRead(BaseModel):
    id: UUID
    issue_number: str
    title: str
    description: str | None = None
    complainant_id: UUID
    current_status: str
    timeline: list[dict[str, Any]] | None = None
    published_report_url: str | None = None
    metadata: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime | None = None
    participants: list[ParticipantRead] | None = None

    class Config:
        from_attributes = True
