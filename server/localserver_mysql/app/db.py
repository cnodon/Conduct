from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse

import mysql.connector
from mysql.connector.pooling import MySQLConnectionPool


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


def parse_mysql_url(database_url: str) -> dict:
    if not database_url:
        raise ValueError("DATABASE_URL is required")
    parsed = urlparse(database_url)
    if parsed.scheme not in {"mysql", "mysql+pymysql", "mysql+mysqlconnector"}:
        raise ValueError("DATABASE_URL must start with mysql://")
    return {
        "user": parsed.username,
        "password": parsed.password,
        "host": parsed.hostname or "127.0.0.1",
        "port": parsed.port or 3306,
        "database": (parsed.path or "/").lstrip("/"),
    }


class Database:
    def __init__(self, database_url: str) -> None:
        config = parse_mysql_url(database_url)
        if not config["database"]:
            raise ValueError("DATABASE_URL must include database name")
        self.pool = MySQLConnectionPool(
            pool_name="conduct_pool",
            pool_size=5,
            **config,
        )

    def close(self) -> None:
        # mysql-connector doesn't expose pool close; connections are closed per use.
        return None

    def insert_launch_event(self, event: LaunchEvent) -> bool:
        query = """
            INSERT IGNORE INTO app_launch_events (
                id,
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
                UUID(),
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
        """
        payload = (
            event.install_id,
            event.app_version,
            event.platform,
            event.os_version,
            event.locale,
            event.ip,
            event.geo_country,
            event.geo_region,
            event.geo_city,
            event.client_timestamp,
            event.client_date,
        )
        conn = self.pool.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(query, payload)
                conn.commit()
                return cur.rowcount == 1
        finally:
            conn.close()
