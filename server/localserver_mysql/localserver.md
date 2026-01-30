# 本地模拟 MySQL + Python（Conduct 启动统计服务）

目标：在本地启动 MySQL 与 FastAPI 服务，用于验证 `/api/events/launch` 上报流程。

---

## 目录
本地模拟目录：`/Users/ddmm/Develop/TokenLabs/app/Conduct/server/localserver_mysql`

包含：
- `app/`：FastAPI 后端代码
- `requirements.txt`：Python 依赖
- `schema.sql`：MySQL 表结构
- `config/.env.example`：环境变量模板

---

## 1) 准备 MySQL

### 方式 A：本机 MySQL
```bash
# macOS 安装示例（Homebrew）
brew install mysql
brew services start mysql

# 创建数据库与用户
mysql -u root <<'SQL'
CREATE DATABASE conduct;
CREATE USER 'conduct'@'localhost' IDENTIFIED BY 'conduct';
GRANT ALL PRIVILEGES ON conduct.* TO 'conduct'@'localhost';
FLUSH PRIVILEGES;
SQL
```

### 方式 B：Docker（可选）
```bash
docker run --name conduct-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=conduct -e MYSQL_USER=conduct -e MYSQL_PASSWORD=conduct -p 3306:3306 -d mysql:8
```

---

## 2) 初始化数据表
```bash
cd /Users/ddmm/Develop/TokenLabs/app/Conduct/server/localserver_mysql
mysql -u conduct -pconduct -h 127.0.0.1 -D conduct < schema.sql
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

---

## 6) 验证数据是否写入
```bash
mysql -u conduct -pconduct -h 127.0.0.1 -D conduct -e "SELECT app_version, platform, locale, client_date, received_at FROM app_launch_events ORDER BY received_at DESC LIMIT 5;"
```

---

## 7) 注意事项
- `install_id + client_date` 有唯一索引，保证每天仅一条。
- `GEOIP_DB_PATH` 为空时不会写入 geo 字段。
