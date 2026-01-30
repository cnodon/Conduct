from __future__ import annotations

from dataclasses import dataclass
from ipaddress import ip_address
from typing import Optional

try:
    import geoip2.database
except ImportError:  # pragma: no cover - optional dependency
    geoip2 = None


@dataclass(frozen=True)
class GeoInfo:
    country: Optional[str]
    region: Optional[str]
    city: Optional[str]


class GeoIPResolver:
    def __init__(self, db_path: str | None) -> None:
        self._db_path = db_path
        self._reader: Optional["geoip2.database.Reader"] = None

    def _load_reader(self) -> Optional["geoip2.database.Reader"]:
        if not self._db_path or geoip2 is None:
            return None
        if self._reader is None:
            self._reader = geoip2.database.Reader(self._db_path)
        return self._reader

    def resolve(self, ip: str) -> GeoInfo:
        try:
            ip_obj = ip_address(ip)
            if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_reserved:
                return GeoInfo(None, None, None)
        except ValueError:
            return GeoInfo(None, None, None)

        reader = self._load_reader()
        if reader is None:
            return GeoInfo(None, None, None)

        try:
            resp = reader.city(ip)
        except Exception:
            return GeoInfo(None, None, None)

        return GeoInfo(
            resp.country.name,
            resp.subdivisions.most_specific.name,
            resp.city.name,
        )

    def close(self) -> None:
        if self._reader is not None:
            self._reader.close()
            self._reader = None
