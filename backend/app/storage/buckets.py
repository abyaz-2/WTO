from __future__ import annotations

from app.storage.client import storage_client
from structlog import get_logger

logger = get_logger()

BUCKET_CONFIGS = {
    "evidence": {
        "public": False,
        "allowed_mime_types": [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "image/jpeg",
            "image/png",
            "image/tiff",
        ],
        "file_size_limit": 52428800,
    },
    "reports": {
        "public": True,
        "allowed_mime_types": [
            "application/pdf",
            "text/html",
            "text/plain",
            "application/json",
        ],
        "file_size_limit": 104857600,
    },
    "avatars": {
        "public": True,
        "allowed_mime_types": [
            "image/jpeg",
            "image/png",
            "image/webp",
        ],
        "file_size_limit": 2097152,
    },
}


async def ensure_buckets() -> None:
    client = storage_client.get_client()
    if not client:
        logger.warning("storage_client_not_available")
        return

    for bucket_name, config in BUCKET_CONFIGS.items():
        try:
            existing = client.get_bucket(bucket_name)
            if existing:
                logger.info("bucket_exists", bucket=bucket_name)
                continue
        except Exception:
            pass

        try:
            client.create_bucket(
                id=bucket_name,
                options={
                    "public": config["public"],
                    "allowed_mime_types": config["allowed_mime_types"],
                    "file_size_limit": config["file_size_limit"],
                },
            )
            logger.info("bucket_created", bucket=bucket_name)
        except Exception as exc:
            logger.error("bucket_creation_failed", bucket=bucket_name, error=str(exc))
