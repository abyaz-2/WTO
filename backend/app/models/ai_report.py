from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.types import JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class AIReport(Base, TimestampMixin):
    __tablename__ = "ai_reports"
    __table_args__ = (
        UniqueConstraint("issue_id", "version", name="uq_ai_report_issue_version"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    issue_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("issues.id"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    content: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True, default=dict)
    confidence_score: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)
    executive_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="generating")
    generated_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    published_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    meta_data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True, default=dict)
