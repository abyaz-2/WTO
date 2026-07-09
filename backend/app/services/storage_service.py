from __future__ import annotations

from typing import List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from structlog import get_logger

from app.config import settings
from app.storage.client import storage_client

logger = get_logger()


class StorageService:
    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self._client = storage_client

    def _get_client(self):
        client = self._client.get_client()
        if not client:
            raise RuntimeError("Storage client is not configured")
        return client

    async def upload_file(
        self,
        bucket: str,
        storage_path: str,
        file_content: bytes,
        content_type: str,
    ) -> str:
        try:
            client = self._get_client()
            client.upload_file(
                bucket_name=bucket,
                path=storage_path,
                file_data=file_content,
                file_options={"content-type": content_type},
            )
            public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{storage_path}"
            logger.info(
                "file_uploaded",
                bucket=bucket,
                path=storage_path,
                size=len(file_content),
            )
            return public_url
        except Exception as exc:
            logger.error("file_upload_failed", bucket=bucket, path=storage_path, error=str(exc))
            raise

    async def get_signed_url(self, bucket: str, storage_path: str, expires_in: int = 3600) -> str:
        try:
            client = self._get_client()
            result = client.create_signed_url(
                bucket_name=bucket,
                path=storage_path,
                expires_in=expires_in,
            )
            return result.get("signedURL", "")
        except Exception as exc:
            logger.error(
                "signed_url_failed",
                bucket=bucket,
                path=storage_path,
                error=str(exc),
            )
            return f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{storage_path}"

    async def delete_file(self, bucket: str, storage_path: str) -> None:
        try:
            client = self._get_client()
            client.remove_file(bucket_name=bucket, path=storage_path)
            logger.info("file_deleted", bucket=bucket, path=storage_path)
        except Exception as exc:
            logger.error("file_delete_failed", bucket=bucket, path=storage_path, error=str(exc))
            raise

    async def list_files(self, bucket: str, prefix: str) -> List[dict]:
        try:
            client = self._get_client()
            result = client.list_files(bucket_name=bucket, path=prefix)
            return result or []
        except Exception as exc:
            logger.error("file_list_failed", bucket=bucket, prefix=prefix, error=str(exc))
            return []
