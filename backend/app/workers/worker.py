from __future__ import annotations

import asyncio
from typing import Any, Dict

from structlog import get_logger

from app.config import settings
from app.dependencies import async_session_factory

logger = get_logger()


async def startup(ctx: Dict[str, Any]) -> None:
    logger.info("worker_started")


async def shutdown(ctx: Dict[str, Any]) -> None:
    logger.info("worker_shutdown")


async def main() -> None:
    logger.info("worker_initializing", environment=settings.ENVIRONMENT)

    while True:
        await asyncio.sleep(60)


if __name__ == "__main__":
    asyncio.run(main())
