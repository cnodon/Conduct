# Conduct Telemetry Server (Python + PostgreSQL)

用于统计 Conduct 启动事件（每日仅一次），写入 PostgreSQL 并支持 Geo 解析。

## 目录结构
```
telemetry_server/
  app/                # FastAPI 应用
  config/.env.example # 环境变量示例
  nginx/              # Nginx 配置模板
  systemd/            # systemd 服务配置
  schema.sql          # PostgreSQL 表结构
```

## 本地运行
```bash
cd telemetry_server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp config/.env.example .env
# 修改 .env 中的 DATABASE_URL

psql "$DATABASE_URL" -f schema.sql

# 启动
uvicorn app.main:app --host 127.0.0.1 --port 8080
```

## API
- `POST /api/events/launch`
- `GET /health`

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

## ECS 部署步骤（建议路径）
```bash
# 1) 上传代码到 /opt/conduct-telemetry
# 2) 创建 venv 并安装依赖
cd /opt/conduct-telemetry
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3) 配置环境变量
cp config/.env.example .env
# 编辑 .env：DATABASE_URL、GEOIP_DB_PATH

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

## GeoIP (可选)
- 下载 MaxMind GeoLite2-City.mmdb
- 放置到 `GEOIP_DB_PATH` 指定路径
- 未配置时仅记录 IP，不写入 geo 字段
