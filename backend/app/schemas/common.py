from __future__ import annotations

from typing import Any, Generic, List, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    total: int
    page: int
    per_page: int
    total_pages: int

    class Config:
        from_attributes = True


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = {}


class ErrorResponse(BaseModel):
    data: None = None
    error: ErrorDetail


class SuccessResponse(BaseModel, Generic[T]):
    data: T | None = None
    error: None = None

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    data: dict[str, str] | None = None
    error: None = None


class PaginationParams(BaseModel):
    page: int = 1
    per_page: int = 20
