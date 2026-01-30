# Conduct 统计服务部署配置（Python + PostgreSQL + Nginx）

本文用于部署启动统计后端服务（tokenlabs.cn）。服务仅记录：IP（服务端采集）、install_id、version、platform、os_version、locale、timestamp，并支持 Geo 解析。

---

## 1. 目标架构
- 域名：`tokenlabs.cn`
- 反向代理：Nginx
- 应用服务：FastAPI（uvicorn）
- 数据库：PostgreSQL
- 可选：GeoLite2 解析 IP

服务路径建议：`/opt/conduct-telemetry`

---

## 2. Nginx 配置
文件：`/etc/nginx/conf.d/conduct-telemetry.conf`
```nginx
server {
  listen 80;
  server_name tokenlabs.cn;

  client_max_body_size 1m;

  location /api/ {
    proxy_pass http://127.0.0.1:8080/;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;
  }

  location /health {
    proxy_pass http://127.0.0.1:8080/health;
  }
}
```

重载：
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 3. PostgreSQL 初始化
数据库结构文件：`telemetry_server/schema.sql`

执行：
```bash
psql "$DATABASE_URL" -f /opt/conduct-telemetry/schema.sql
```

核心表：`app_launch_events`
- 唯一去重：`(install_id, client_date)`，保证每天只记一次

---

## 4. 应用环境变量
文件：`/opt/conduct-telemetry/.env`
```bash
DATABASE_URL=postgresql://conduct:password@127.0.0.1:5432/conduct
GEOIP_DB_PATH=/opt/geoip/GeoLite2-City.mmdb
LISTEN_HOST=127.0.0.1
LISTEN_PORT=8080
```

说明：
- `GEOIP_DB_PATH` 为空时不解析 geo

---

## 5. systemd 配置
文件：`/etc/systemd/system/conduct-telemetry.service`
```ini
[Unit]
Description=Conduct Telemetry API
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/conduct-telemetry
EnvironmentFile=/opt/conduct-telemetry/.env
ExecStart=/opt/conduct-telemetry/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8080
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

启停：
```bash
sudo systemctl daemon-reload
sudo systemctl enable conduct-telemetry
sudo systemctl start conduct-telemetry
sudo systemctl status conduct-telemetry
```

---

## 6. 安装服务步骤（ECS）
```bash
# 1) 上传代码到 /opt/conduct-telemetry
# 2) 创建 venv 并安装依赖
cd /opt/conduct-telemetry
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3) 配置环境变量
cp config/.env.example .env
# 修改 .env

# 4) 初始化数据库
psql "$DATABASE_URL" -f schema.sql

# 5) systemd
sudo cp systemd/conduct-telemetry.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable conduct-telemetry
sudo systemctl start conduct-telemetry

# 6) Nginx
sudo cp nginx/conduct-telemetry.conf /etc/nginx/conf.d/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 7. API 说明
- POST `/api/events/launch`
- GET `/health`

请求示例：
```json
{
  "install_id": "0d3e5b16-9c9c-4a2c-90a0-4b9325c3f39d",
  "app_version": "0.8.8",
  "platform": "macos",
  "os_version": "14.5.0",
  "locale": "zh-CN",
  "timestamp": "2026-01-30T22:12:10.000Z"
}
```

响应：
```json
{ "ok": true, "deduped": false }
```

---

## 8. GeoIP 配置（可选）
- 下载 MaxMind GeoLite2-City 数据库（.mmdb）
- 放置在 `/opt/geoip/GeoLite2-City.mmdb`
- 配置 `GEOIP_DB_PATH` 指向该文件

---

## 9. 常用排错
```bash
# 查看服务日志
journalctl -u conduct-telemetry -f

# 测试健康检查
curl http://127.0.0.1:8080/health

# 测试上报
curl -X POST http://127.0.0.1:8080/api/events/launch \
  -H "Content-Type: application/json" \
  -d '{"install_id":"0d3e5b16-9c9c-4a2c-90a0-4b9325c3f39d","app_version":"0.8.8","platform":"macos","os_version":"14.5.0","locale":"zh-CN","timestamp":"2026-01-30T22:12:10.000Z"}'
```
