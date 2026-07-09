from __future__ import annotations

import os
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    DATABASE_URL: str = "sqlite+aiosqlite:///./wto_dev.db"
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    REDIS_URL: str = "redis://localhost:6379/0"

    STORAGE_BUCKET_EVIDENCE: str = "evidence"
    STORAGE_BUCKET_REPORTS: str = "reports"
    STORAGE_BUCKET_AVATARS: str = "avatars"

    CORS_ORIGINS: str = "http://localhost:3000"
    LOG_LEVEL: str = "INFO"
    ENVIRONMENT: str = "development"

    API_VERSION: str = "v1"
    PROJECT_NAME: str = "WTO Digital Dispute Documentation Platform"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()

if os.getenv("ENVIRONMENT") == "production":
    settings = Settings(_env_file=None)
