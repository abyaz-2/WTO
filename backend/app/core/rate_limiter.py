from __future__ import annotations

import time
from functools import wraps
from typing import Callable, Dict, Optional

import redis.asyncio as aioredis
from fastapi import Request
from structlog import get_logger

from app.config import settings
from app.core.exceptions import RateLimitException

logger = get_logger()


class RedisRateLimiter:
    def __init__(self) -> None:
        self._redis: Optional[aioredis.Redis] = None

    async def initialize(self) -> None:
        try:
            self._redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            await self._redis.ping()
            logger.info("rate_limiter_redis_connected")
        except Exception as exc:
            logger.warning("rate_limiter_redis_unavailable", error=str(exc))
            self._redis = None

    async def close(self) -> None:
        if self._redis:
            await self._redis.close()

    async def check_rate_limit(
        self,
        key: str,
        max_requests: int = 60,
        window_seconds: int = 60,
    ) -> bool:
        if not self._redis:
            return True

        now = int(time.time())
        window_start = now - window_seconds

        pipe = self._redis.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {str(now): now})
        pipe.expire(key, window_seconds)
        results = await pipe.execute()

        request_count = results[1]
        return request_count <= max_requests

    async def get_remaining(self, key: str, max_requests: int, window_seconds: int) -> int:
        if not self._redis:
            return max_requests

        now = int(time.time())
        window_start = now - window_seconds
        await self._redis.zremrangebyscore(key, 0, window_start)
        count = await self._redis.zcard(key)
        return max(0, max_requests - count)


rate_limiter = RedisRateLimiter()


def rate_limit(max_requests: int = 60, window_seconds: int = 60) -> Callable:
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            client_ip = request.client.host if request.client else "unknown"
            route_key = f"{request.method}:{request.url.path}"
            key = f"rate_limit:{route_key}:{client_ip}"

            allowed = await rate_limiter.check_rate_limit(key, max_requests, window_seconds)
            if not allowed:
                raise RateLimitException()

            return await func(request, *args, **kwargs)

        return wrapper

    return decorator
