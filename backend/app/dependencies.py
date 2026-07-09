from __future__ import annotations

from typing import AsyncGenerator
from uuid import UUID

from fastapi import Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.core.exceptions import UnauthorizedException
from app.core.security import verify_supabase_jwt
from app.models.user import User
from app.repositories.user_repository import UserRepository
from structlog import get_logger

logger = get_logger()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    pool_size=20,
    max_overflow=10,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_current_user(
    request: Request,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization:
        raise UnauthorizedException("Authorization header is required")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise UnauthorizedException("Invalid authorization header format")

    payload = verify_supabase_jwt(token)
    supabase_id = payload.get("sub", "")

    if not supabase_id:
        raise UnauthorizedException("Invalid token payload")

    user_repo = UserRepository(db)
    user = await user_repo.get_by_supabase_id(supabase_id)

    if not user:
        raise UnauthorizedException("User not found")

    if not user.is_active:
        raise UnauthorizedException("User account is deactivated")

    request.state.user = user
    return user


async def get_current_eb_user(
    current_user: User = Depends(get_current_user),
) -> User:
    from app.core.constants import UserRole
    if current_user.role != UserRole.EXECUTIVE_BOARD.value:
        raise UnauthorizedException("Executive Board access required")
    return current_user


async def get_current_participant(
    issue_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    from app.repositories.participant_repository import ParticipantRepository
    participant_repo = ParticipantRepository(db)
    participant = await participant_repo.get_by_issue_and_user(
        UUID(issue_id), current_user.id
    )
    if not participant:
        raise UnauthorizedException("You are not a participant in this issue")
    return current_user
