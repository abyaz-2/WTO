from __future__ import annotations

from app.config import settings


class WorkerSettings:
    redis_settings = {"host": settings.REDIS_URL}
    functions: list[str] = []
    burst: bool = False
    on_startup: list[callable] = []
    on_shutdown: list[callable] = []
    poll_delay: float = 0.5
    max_retries: int = 3
    retry_delay: float = 10.0
    keep_result: int = 3600
    keep_result_failed: int = 86400
