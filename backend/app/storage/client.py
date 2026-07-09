from __future__ import annotations

from supabase import create_client
from supabase.lib.client_options import ClientOptions
from structlog import get_logger

from app.config import settings

logger = get_logger()


class LazyStorageClient:
    _instance = None

    def __init__(self):
        self._client = None

    def get_client(self):
        if self._client is not None:
            return self._client

        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
            logger.warning("supabase_not_configured")
            self._client = None
            return None

        try:
            options = ClientOptions(
                headers={"Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}"},
            )
            client = create_client(
                supabase_url=settings.SUPABASE_URL,
                supabase_key=settings.SUPABASE_SERVICE_KEY,
                options=options,
            )
            self._client = client.storage
            return self._client
        except Exception as exc:
            logger.warning("supabase_client_creation_failed", error=str(exc))
            self._client = None
            return None


storage_client = LazyStorageClient()
