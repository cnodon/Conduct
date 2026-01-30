from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str
    geoip_db_path: str | None
    listen_host: str
    listen_port: int


def load_settings() -> Settings:
    return Settings(
        database_url=os.environ.get("DATABASE_URL", ""),
        geoip_db_path=os.environ.get("GEOIP_DB_PATH"),
        listen_host=os.environ.get("LISTEN_HOST", "127.0.0.1"),
        listen_port=int(os.environ.get("LISTEN_PORT", "8080")),
    )
