# Conduct - Skills Manager for Claude Code, Codex & Gemini CLI

一个用于扫描、分析和管理 **Claude Code**、**Codex** 与 **Gemini CLI** Skills 配置状态的跨平台诊断工具。

## 核心能力速览
- **多平台扫描与层级解析**：自动识别个人/项目/嵌套/插件等路径，并按平台优先级整理展示。
- **技能解析与校验**：解析 `SKILL.md` 元数据，识别缺失字段与潜在冲突。
- **冲突与覆盖提示**：检测同名 Skills 并标注实际生效项。
- **安装与管理**：支持从 Git 安装，且可将本地技能一键安装到其他 CLI。
- **市场聚合**：基于 `skills_repo.json` 聚合仓库，缓存加速并支持浏览安装。
- **市场体验优化**：同步状态可视化、骨架加载、分页进度展示、手动更新（缓存为空时自动拉取一次）、新增 Repo。
- **更新与版本检查**：设置页支持手动检查更新与启动时自动检查，可跳转 Release 下载或一键下载安装，并展示 Release Notes 与下载进度。
- **启动统计（可选）**：应用每次启动上报一次启动事件（install_id / 版本 / 平台 / 系统版本 / 语言 / 时间戳），失败最多重试 3 次，服务端记录 IP，并写入运行日志便于排查。
- **界面优化**：顶部导航留白更均衡，左侧栏图标支持直达 GitHub 项目页。
- **Settings 功能清单**：详见 `settings.md`（便于产品与测试对齐）。

## 安装

```bash
# 安装依赖
npm install

# 或使用 pnpm
pnpm install
```

## 使用

### CLI 模式

```bash
# 扫描 Claude Skills (默认)
npm run scan

# 扫描 Codex Skills
npm run cli -- codex-scan

# 扫描 Gemini Skills
npm run cli -- gemini-scan

# 扫描指定项目
npm run cli -- scan --project /path/to/project

# 输出 JSON 格式
npm run cli -- scan --format json

# 输出到文件
npm run cli -- scan --output report.md --format markdown

# 列出所有 Skills
npm run cli -- list
```

### GUI 模式

GUI 使用 Tauri + React 实现，提供沉浸式的多平台管理体验。

```bash
# 开发模式启动 GUI
npm run dev:tauri

# 或直接启动
npm run gui
```

## 卸载

提供一键卸载脚本（删除应用、日志与本地配置）：

```bash
# 预览将删除的内容
./scripts/uninstall_conduct.sh --dry-run

# 执行卸载
./scripts/uninstall_conduct.sh --yes
```

## 版本号与编译时间
- 构建脚本 `npm run version:build` 在打包前执行。
- 应用版本采用 SemVer（`MAJOR.MINOR.PATCH`），默认读取 `package.json` 的 `version`（可用 `BASE_VERSION` 覆盖）。
- 编译时间戳会写入 `version.json` 的 `build` 字段，便于定位构建。
- 编译时间戳与版本写入位置详见 `impl.md`。

## 运行日志
- 运行期日志写入 `runtime_log.md`。
- 应用启动时会自动创建 `runtime_log.md`。
- macOS: `~/Library/Logs/Conduct/`
- Windows: `%APPDATA%\\Conduct\\logs\\`

## Marketplace 配置
- 启动时会确保 `skills_repo.json` 存在于用户目录的 `~/.Conduct/`。
- macOS: `~/.Conduct/skills_repo.json`
- Windows: `%USERPROFILE%\\.Conduct\\skills_repo.json`
- 可通过环境变量 `CONDUCT_SKILLS_REPO_PATH` 指定自定义路径。
- Marketplace 列表默认按每页 18 个技能分页显示，并支持页码跳转。

## 相关文档
- 实现与规则细节：`impl.md`
- Marketplace PRD：`prd_marketplace.md`
- 产品需求文档：`prd.md`
- 日志 PRD：`prd_log.md`
- 设计资产：`design/app-icon.svg`
- 启动统计服务（可选）：`telemetry_server/README.md`
- 本地模拟统计服务（PostgreSQL）：`server/localserver_PostgreSQL/localserver.md`
- 本地模拟统计服务（MySQL）：`server/localserver_mysql/localserver.md`

## 开发

### 项目结构
```
conduct/
├── src/
│   ├── core/              # 核心引擎 (LocationResolver, Scanner, Parser...)
│   ├── cli/               # CLI 模式入口
│   ├── gui/               # GUI 模式 (React Frontend)
│   └── types/             # 全局类型定义
├── src-tauri/             # Tauri Backend (Rust)
├── design/                # 设计文档
└── prd.md                 # 产品需求文档
```

## 打包发布

### 本地打包
```bash
# macOS / Windows（在对应系统上执行）
npm run build:tauri
```

### CI 打包（macOS + Windows）
仓库已提供 GitHub Actions 工作流：`.github/workflows/tauri-build.yml`  
推送 `v*` 标签或手动触发后，会产出各平台安装包并上传为构建产物。

## 许可证
MIT
