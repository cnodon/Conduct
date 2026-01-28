# Conduct Marketplace 产品需求文档 (PRD)

**版本:** 1.1
**日期:** 2026-01-23
**产品名称:** Conduct - Skills Marketplace

---

## 1. 产品概述

### 1.1 背景
Skills Marketplace 是 Conduct 的核心扩展模块，旨在解决用户“发现难、安装繁”的问题。通过聚合官方及社区的优质 Skills，提供类似 App Store 的一站式浏览与安装体验。

### 1.2 核心价值
- **发现 (Discover)**: 聚合多来源 Skills，提供分类与搜索。
- **安装 (Install)**: 消除复杂的 Git Clone 操作，一键安装到指定 CLI 环境。
- **透明 (Transparent)**: 安装前预览权限、命令与文件结构。

---

## 2. 功能架构

### 2.1 仓库源管理 (Repo Subscription)
- **配置文件**: 基于 `skills_repo.json` 定义订阅源列表。
- **数据结构**:
  ```json
  {
    "repositories": [
      {
        "name": "anthropics/skills",
        "url": "https://github.com/anthropics/skills.git",
        "description": "Official collection"
      }
    ]
  }
  ```
- **更新机制**: 应用启动时自动检查更新，或用户点击刷新按钮时强制拉取最新仓库代码并重新索引。

### 2.2 Skills 发现引擎 (Discovery Engine)
- **递归解析**: 自动克隆仓库并递归遍历子目录。
- **识别规则**: 仅将包含 `SKILL.md` 的目录识别为有效 Skill。
- **元数据提取**: 解析 `SKILL.md` frontmatter，提取 `name`, `description`, `author`, `tags` 等信息。

### 2.3 用户界面 (Marketplace GUI)
- **界面参考**: `design/marketplace/screen.png`
- **代码参考**: `design/marketplace/code.html`
- **布局**: 顶部搜索栏/筛选器 + 下方 list 视图。
- **列表展示**:
  - 采用 **列表 (List)** 形式展示，每行 1 个 (响应式)。
  - **图标**: 提取 Skill 类别图标，若无则使用默认图标 (`/res/skill_icon.png` 或内置 SVG)。
  - **内容**: 名称、简短描述、作者 (Git用户名)、Star 数 (Mock/API)、标签。
  - **状态**: 显示 "Install" 按钮或 "Installed" 状态标记。
- **分页/加载**: 支持无限滚动 (Infinite Scroll) 或 "加载更多" 按钮，每次加载 10-20 个。

### 2.4 安装管理器 (Installer)
- **目标平台选择**: 安装时弹出模态框或下拉菜单，选择目标 CLI (Claude Code / Codex / Gemini)。
- **冲突检测**: 安装前检测本地是否已存在同名 Skill，若存在则提示覆盖或跳过。
- **安装进度**: 界面显示下载和安装的进度条或 Loading 状态。

---

## 3. 交互流程

1. **初始化**: 应用启动，读取 `skills_repo_list.json` 缓存展示列表。后台异步拉取 `skills_repo.json` 定义的仓库并更新缓存。
2. **浏览**: 用户滚动浏览 Skills 卡片。
3. **搜索**: 顶部输入关键词 (如 "docker")，前端实时过滤列表。
4. **详情**: 点击卡片，右侧滑出 (Slide-over) 详情面板，展示完整 README、权限和文件结构。
5. **安装**: 
   - 点击 "Install" -> 选择 "Claude Code" (默认)。
   - 系统执行 `git clone` (子目录模式) 到 `~/.claude/skills/`。
   - 按钮状态变为 "Installed"。

---

## 4. 技术方案

- **数据源**: 直接克隆 Git 仓库到本地临时目录 (如 `/tmp/conduct_marketplace`) 进行解析。
- **缓存**: 解析结果序列化为 JSON 缓存于本地 (如 `app_data/skills_repo_list.json`)，避免每次重启都全量克隆，提升启动速度。
- **搜索**: 前端基于内存数据进行实时搜索/过滤，无需后端查询。
- **图片资源**: Skill 图标如果未在仓库中定义，前端根据 `tags` 自动匹配内置的 Material Symbols 图标。