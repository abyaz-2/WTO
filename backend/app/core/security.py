from __future__ import annotations

from typing import Any, Dict, Optional
from uuid import UUID

from jose import JWTError, jwt
from structlog import get_logger

from app.config import settings
from app.core.constants import UserRole
from app.core.exceptions import ForbiddenException, UnauthorizedException

logger = get_logger()


def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    if not settings.SUPABASE_JWT_SECRET:
        raise UnauthorizedException("JWT secret not configured")

    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except JWTError as exc:
        logger.warning("jwt_verification_failed", error=str(exc))
        raise UnauthorizedException("Invalid or expired token") from exc


def extract_user_info(payload: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "sub": payload.get("sub"),
        "email": payload.get("email", ""),
        "role": payload.get("role", ""),
        "phone": payload.get("phone", ""),
        "user_metadata": payload.get("user_metadata", {}),
        "app_metadata": payload.get("app_metadata", {}),
    }


def check_role(allowed_roles: list[UserRole], user_role: str) -> None:
    if user_role not in [r.value for r in allowed_roles]:
        raise ForbiddenException(
            f"Requires one of these roles: {', '.join(r.value for r in allowed_roles)}"
        )


def require_eb(user_role: str) -> None:
    check_role([UserRole.EXECUTIVE_BOARD], user_role)


def require_participant_or_eb(user_role: str) -> None:
    check_role([UserRole.EXECUTIVE_BOARD, UserRole.DELEGATE], user_role)
