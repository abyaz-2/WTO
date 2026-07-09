from __future__ import annotations

import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from structlog import get_logger

logger = get_logger()


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        request_id = getattr(request.state, "request_id", None)

        logger.info(
            "request_started",
            method=request.method,
            path=str(request.url.path),
            query_string=str(request.url.query),
            request_id=request_id,
            client_host=request.client.host if request.client else None,
        )

        try:
            response = await call_next(request)
            process_time = (time.time() - start_time) * 1000

            logger.info(
                "request_completed",
                method=request.method,
                path=str(request.url.path),
                status_code=response.status_code,
                duration_ms=round(process_time, 2),
                request_id=request_id,
            )

            response.headers["X-Process-Time-MS"] = str(round(process_time, 2))
            return response
        except Exception as exc:
            process_time = (time.time() - start_time) * 1000
            logger.error(
                "request_failed",
                method=request.method,
                path=str(request.url.path),
                error=str(exc),
                duration_ms=round(process_time, 2),
                request_id=request_id,
            )
            raise
