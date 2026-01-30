# 本地模拟 PostgreSQL + Python（Conduct 启动统计服务）

目标：在本地启动 PostgreSQL 与 FastAPI 服务，用于验证 `/api/events/launch` 上报流程。

---

## 目录
本地模拟目录：`/Users/ddmm/Develop/TokenLabs/app/Conduct/server/localserver_PostgreSQL`

包含：
- `app/`：FastAPI 后端代码
- `requirements.txt`：Python 依赖
- `schema.sql`：PostgreSQL 表结构
- `config/.env.example`：环境变量模板

---

## 1) 准备 PostgreSQL

### 方式 A：本机 PostgreSQL
```bash
# 如果已安装 PostgreSQL，可跳过安装步骤
# macOS 安装示例（Homebrew）
brew install postgresql@15
brew services start postgresql@15

# 创建数据库与用户
psql postgres <<'SQL'
CREATE USER conduct WITH PASSWORD 'conduct';
CREATE DATABASE conduct OWNER conduct;
SQL
```

### 方式 B：Docker（可选）
```bash
docker run --name conduct-postgres -e POSTGRES_USER=conduct -e POSTGRES_PASSWORD=conduct -e POSTGRES_DB=conduct -p 5432:5432 -d postgres:15
```

---

## 2) 初始化数据表
```bash
cd /Users/ddmm/Develop/TokenLabs/app/Conduct/server/localserver_PostgreSQL
psql "postgresql://conduct:conduct@127.0.0.1:5432/conduct" -f schema.sql
```

---

## 3) 配置环境变量
```bash
cp config/.env.example .env
# 如果数据库不在本机，请修改 DATABASE_URL
```

---

## 4) 启动 Python 服务
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

export $(grep -v '^#' .env | xargs)
uvicorn app.main:app --host 127.0.0.1 --port 8080
```

---

## 5) 本地测试请求
```bash
curl -X POST http://127.0.0.1:8080/api/events/launch \
  -H "Content-Type: application/json" \
  -d '{"install_id":"0d3e5b16-9c9c-4a2c-90a0-4b9325c3f39d","app_version":"0.8.8","platform":"macos","os_version":"14.5.0","locale":"zh-CN","timestamp":"2026-01-30T22:12:10.000Z"}'
```

成功响应示例：
```json
{ "ok": true, "deduped": false }
```

如不想使用命令行，可直接运行测试脚本：
```bash
python send_test_request.py
```

远程测试（tokenlabs.cn）：
```bash
EVENT_ENDPOINT=https://tokenlabs.cn/api/events/launch python send_test_request.py
```

---

## 6) 验证数据是否写入
```bash
psql "postgresql://conduct:conduct@127.0.0.1:5432/conduct" -c "SELECT app_version, platform, locale, client_date, received_at FROM app_launch_events ORDER BY received_at DESC LIMIT 5;"
```

---

## 7) 注意事项
- `install_id + client_date` 有唯一索引，保证每天仅一条。
- `GEOIP_DB_PATH` 为空时不会写入 geo 字段。

---

## 8) ECS 部署步骤（PostgreSQL 方案）
远程服务器：`yuand@121.196.228.114`

以下以 **Ubuntu/Debian** 为例；若是 CentOS/Alibaba Cloud Linux，请告诉我我再给对应命令。

### Step 1: 登录服务器
```bash
ssh yuand@121.196.228.114
```

### Step 2: 安装 PostgreSQL + Python + Nginx
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib python3 python3-venv python3-pip nginx
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### Step 3: 创建数据库与用户
```bash
sudo -u postgres psql <<'SQL'
CREATE USER conduct WITH PASSWORD 'conduct';
CREATE DATABASE conduct OWNER conduct;
SQL
```

### Step 4: 上传代码到 ECS
建议先上传到用户目录，再移动到 `/opt`（避免权限问题）。
在本机执行：
```bash
scp -r /Users/ddmm/Develop/TokenLabs/app/Conduct/server/localserver_PostgreSQL yuand@121.196.228.114:~/conduct-telemetry
```
在服务器执行：
```bash
sudo mkdir -p /opt/conduct-telemetry
sudo mv ~/conduct-telemetry/* /opt/conduct-telemetry/
sudo chown -R yuand:yuand /opt/conduct-telemetry
```

### Step 5: 初始化表结构
```bash
cd /opt/conduct-telemetry
psql "postgresql://conduct:conduct@127.0.0.1:5432/conduct" -f schema.sql
```

### Step 6: 配置环境变量
```bash
cp config/.env.example .env
# 如有需要，修改 DATABASE_URL
```

### Step 7: 创建虚拟环境并安装依赖
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 8: 启动服务（临时验证）
```bash
export $(grep -v '^#' .env | xargs)
uvicorn app.main:app --host 127.0.0.1 --port 8080
```

验证：
```bash
curl http://127.0.0.1:8080/health
```

### Step 9: 配置 systemd（后台常驻）
创建 `/etc/systemd/system/conduct-telemetry.service`：
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

启用：
```bash
sudo systemctl daemon-reload
sudo systemctl enable conduct-telemetry
sudo systemctl start conduct-telemetry
sudo systemctl status conduct-telemetry
```

### Step 10: Nginx 反向代理（tokenlabs.cn）
创建 `/etc/nginx/conf.d/conduct-telemetry.conf`：
```nginx
server {
  listen 80;
  server_name tokenlabs.cn;

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

### Step 11: 远程验证
```bash
curl http://127.0.0.1:8080/health
curl http://tokenlabs.cn/health
```

如需我补充 CentOS / Alibaba Cloud Linux 版本命令，请告诉我系统类型。
