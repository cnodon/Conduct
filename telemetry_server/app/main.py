from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import FastAPI, Request
from pydantic import BaseModel, Field

from .config import load_settings
from .db import Database, LaunchEvent
from .geoip import GeoIPResolver


class LaunchEventIn(BaseModel):
    install_id: UUID
    app_version: str = Field(min_length=1, max_length=32)
    platform: str = Field(min_length=1, max_length=32)
    os_version: str = Field(min_length=1, max_length=64)
    locale: str = Field(min_length=2, max_length=32)
    timestamp: datetime


class LaunchEventOut(BaseModel):
    ok: bool
    deduped: bool


settings = load_settings()
app = FastAPI(title="Conduct Telemetry")

_db: Optional[Database] = None
_geo: Optional[GeoIPResolver] = None


def get_db() -> Database:
    global _db
    if _db is None:
        _db = Database(settings.database_url)
    return _db


def get_geo() -> GeoIPResolver:
    global _geo
    if _geo is None:
        _geo = GeoIPResolver(settings.geoip_db_path)
    return _geo


def extract_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else ""


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/api/events/launch", response_model=LaunchEventOut)
def launch_event(payload: LaunchEventIn, request: Request) -> LaunchEventOut:
    ip = extract_ip(request)
    geo = get_geo().resolve(ip)
    client_timestamp = payload.timestamp.isoformat()
    client_date = payload.timestamp.date().isoformat()

    event = LaunchEvent(
        install_id=str(payload.install_id),
        app_version=payload.app_version,
        platform=payload.platform,
        os_version=payload.os_version,
        locale=payload.locale,
        ip=ip,
        geo_country=geo.country,
        geo_region=geo.region,
        geo_city=geo.city,
        client_timestamp=client_timestamp,
        client_date=client_date,
    )

    inserted = get_db().insert_launch_event(event)
    return LaunchEventOut(ok=True, deduped=not inserted)


@app.on_event("shutdown")
def shutdown() -> None:
    if _geo is not None:
        _geo.close()
    if _db is not None:
        _db.close()
