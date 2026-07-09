from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from app.config import settings
from app.dependencies import get_db
from app.storage.client import storage_client

logger = get_logger()
router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    checks = {
        "status": "healthy",
        "version": settings.API_VERSION,
        "environment": settings.ENVIRONMENT,
    }

    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "connected"
    except Exception as exc:
        logger.error("health_check_db_failed", error=str(exc))
        checks["database"] = "disconnected"
        checks["status"] = "degraded"

    try:
        from app.core.rate_limiter import rate_limiter
        if rate_limiter._redis:
            await rate_limiter._redis.ping()
            checks["redis"] = "connected"
        else:
            checks["redis"] = "not_configured"
    except Exception as exc:
        logger.error("health_check_redis_failed", error=str(exc))
        checks["redis"] = "disconnected"
        checks["status"] = "degraded"

    if storage_client.get_client():
        checks["storage"] = "connected"
    else:
        checks["storage"] = "not_configured"

    if checks["status"] == "healthy":
        return {"data": checks, "error": None}
    return {"data": checks, "error": None}
