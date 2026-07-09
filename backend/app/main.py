from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from structlog import get_logger

from app.api.v1.router import api_router
from app.config import settings
from app.core.error_handlers import setup_error_handlers
from app.core.middleware import setup_middleware
from app.core.rate_limiter import rate_limiter
from app.storage.buckets import ensure_buckets

logger = get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "application_starting",
        environment=settings.ENVIRONMENT,
        version=settings.API_VERSION,
    )
    await rate_limiter.initialize()

    try:
        await ensure_buckets()
    except Exception as exc:
        logger.warning("bucket_setup_failed", error=str(exc))

    yield

    await rate_limiter.close()
    logger.info("application_shutting_down")


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.API_VERSION,
        lifespan=lifespan,
        docs_url="/api/v1/docs" if settings.ENVIRONMENT != "production" else None,
        redoc_url="/api/v1/redoc" if settings.ENVIRONMENT != "production" else None,
    )

    setup_middleware(app)
    setup_error_handlers(app)
    app.include_router(api_router)

    return app


app = create_application()
