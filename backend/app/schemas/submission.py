from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, StringConstraints
from typing_extensions import Annotated


class SubmissionCreate(BaseModel):
    submission_type: Annotated[
        str,
        StringConstraints(
            pattern=r"^(initial_submission|response|rebuttal|supplemental|final_argument|other)$"
        ),
    ]
    content: dict[str, Any] | None = None

    class Config:
        from_attributes = True


class SubmissionUpdate(BaseModel):
    content: dict[str, Any] | None = None

    class Config:
        from_attributes = True


class SubmissionRead(BaseModel):
    id: UUID
    issue_id: UUID
    participant_id: UUID
    submission_type: str
    content: dict[str, Any] | None = None
    status: str
    submitted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
