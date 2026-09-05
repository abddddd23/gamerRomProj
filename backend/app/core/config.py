import json
import os
import secrets
from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict
from app.core.paths import ensure_app_directories


class Settings(BaseSettings):
    app_environment: str = "development"
    database_mode: str = "sqlite"
    database_url: str | None = None
    jwt_secret: str | None = None
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:8000"]
    host: str = "127.0.0.1"
    port: int = 8000
    log_level: str = "INFO"
    ai_event_cooldown_seconds: int = 8

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return [str(origin).strip() for origin in value if str(origin).strip()]
        if isinstance(value, str):
            raw_value = value.strip()
            if not raw_value:
                return []
            if raw_value.startswith("["):
                parsed = json.loads(raw_value)
                if not isinstance(parsed, list):
                    raise ValueError("CORS_ORIGINS JSON value must be a list")
                return [str(origin).strip() for origin in parsed if str(origin).strip()]
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    def model_post_init(self, __context: object) -> None:
        if self.database_mode not in {"sqlite", "postgres"}:
            raise ValueError("DATABASE_MODE must be sqlite or postgres")
        if not self.database_url:
            if self.database_mode == "postgres":
                raise ValueError("DATABASE_URL is required when DATABASE_MODE=postgres")
            paths = ensure_app_directories()
            self.database_url = f"sqlite:///{paths['data'] / 'gaming_room.db'}"
        if not self.jwt_secret:
            paths = ensure_app_directories()
            secret_file = paths["data"] / "jwt_secret.txt"
            if secret_file.exists():
                self.jwt_secret = secret_file.read_text(encoding="utf-8").strip()
            else:
                self.jwt_secret = secrets.token_urlsafe(48)
                secret_file.write_text(self.jwt_secret, encoding="utf-8")
                if os.name != "nt":
                    secret_file.chmod(0o600)


@lru_cache
def get_settings() -> Settings:
    return Settings()
