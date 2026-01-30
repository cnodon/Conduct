CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS app_launch_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  install_id UUID NOT NULL,
  app_version TEXT NOT NULL,
  platform TEXT NOT NULL,
  os_version TEXT NOT NULL,
  locale TEXT NOT NULL,
  ip INET NOT NULL,
  geo_country TEXT,
  geo_region TEXT,
  geo_city TEXT,
  client_timestamp TIMESTAMPTZ,
  client_date DATE NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_launch_install_day
  ON app_launch_events (install_id, client_date);

CREATE INDEX IF NOT EXISTS idx_launch_received_at ON app_launch_events (received_at);
CREATE INDEX IF NOT EXISTS idx_launch_version ON app_launch_events (app_version);
CREATE INDEX IF NOT EXISTS idx_launch_platform ON app_launch_events (platform);
CREATE INDEX IF NOT EXISTS idx_launch_geo_country ON app_launch_events (geo_country);
