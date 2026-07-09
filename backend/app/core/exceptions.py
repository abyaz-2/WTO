from __future__ import annotations

from typing import Any, Dict, Optional


class AppException(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class NotFoundException(AppException):
    def __init__(self, resource: str = "Resource", resource_id: Optional[str] = None) -> None:
        message = f"{resource} not found"
        if resource_id:
            message = f"{resource} with id '{resource_id}' not found"
        super().__init__(status_code=404, code="NOT_FOUND", message=message)


class ForbiddenException(AppException):
    def __init__(self, message: str = "You do not have permission to perform this action") -> None:
        super().__init__(status_code=403, code="FORBIDDEN", message=message)


class ValidationException(AppException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(status_code=422, code="VALIDATION_ERROR", message=message, details=details)


class ConflictException(AppException):
    def __init__(self, message: str = "Resource already exists") -> None:
        super().__init__(status_code=409, code="CONFLICT", message=message)


class InvalidTransitionException(AppException):
    def __init__(self, current_status: str, target_status: str) -> None:
        message = f"Cannot transition from '{current_status}' to '{target_status}'"
        super().__init__(
            status_code=422,
            code="INVALID_TRANSITION",
            message=message,
            details={"current_status": current_status, "target_status": target_status},
        )


class RateLimitException(AppException):
    def __init__(self, message: str = "Rate limit exceeded. Try again later.") -> None:
        super().__init__(status_code=429, code="RATE_LIMIT_EXCEEDED", message=message)


class BadRequestException(AppException):
    def __init__(self, message: str = "Bad request") -> None:
        super().__init__(status_code=400, code="BAD_REQUEST", message=message)


class UnauthorizedException(AppException):
    def __init__(self, message: str = "Not authenticated") -> None:
        super().__init__(status_code=401, code="UNAUTHORIZED", message=message)
