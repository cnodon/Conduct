from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from psycopg_pool import ConnectionPool


@dataclass(frozen=True)
class LaunchEvent:
    install_id: str
    app_version: str
    platform: str
    os_version: str
    locale: str
    ip: str
    geo_country: Optional[str]
    geo_region: Optional[str]
    geo_city: Optional[str]
    client_timestamp: Optional[str]
    client_date: str


class Database:
    def __init__(self, database_url: str) -> None:
        if not database_url:
            raise ValueError("DATABASE_URL is required")
        self.pool = ConnectionPool(conninfo=database_url, min_size=1, max_size=5)

    def close(self) -> None:
        self.pool.close()

    def insert_launch_event(self, event: LaunchEvent) -> bool:
        query = """
            INSERT INTO app_launch_events (
                install_id,
                app_version,
                platform,
                os_version,
                locale,
                ip,
                geo_country,
                geo_region,
                geo_city,
                client_timestamp,
                client_date
            )
            VALUES (
                %(install_id)s,
                %(app_version)s,
                %(platform)s,
                %(os_version)s,
                %(locale)s,
                %(ip)s,
                %(geo_country)s,
                %(geo_region)s,
                %(geo_city)s,
                %(client_timestamp)s,
                %(client_date)s
            )
            ON CONFLICT DO NOTHING
            RETURNING id;
        """
        payload = {
            "install_id": event.install_id,
            "app_version": event.app_version,
            "platform": event.platform,
            "os_version": event.os_version,
            "locale": event.locale,
            "ip": event.ip,
            "geo_country": event.geo_country,
            "geo_region": event.geo_region,
            "geo_city": event.geo_city,
            "client_timestamp": event.client_timestamp,
            "client_date": event.client_date,
        }
        with self.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, payload)
                row = cur.fetchone()
                return row is not None
