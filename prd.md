# Conduct 产品需求文档 (PRD)

**版本:** 1.2
**日期:** 2026-01-23
**产品名称:** Conduct

---

## 1. 产品概述

### 1.1 产品定位

Conduct 是一个用于扫描、分析和管理 **Claude Code**, **Codex** 与 **Gemini CLI** Skills 配置状态的诊断工具。它提供 CLI 和 GUI 两种模式，帮助开发者可视化管理多平台、多层级的 Skills 结构，支持一键安装、冲突分析与配置验证。

### 1.2 核心价值

- 🔍 **多平台兼容** - 统一管理 Claude, Codex, Gemini 的技能体系。
- 📊 **可视化层级** - 自动反映各 CLI 特有的优先级覆盖逻辑（如 Codex 的递归父目录查找）。
- 🚀 **零延迟交互** - 全局数据预加载与缓存机制，瞬间切换不同 CLI 视图。
- 📂 **深度洞察** - 直接查看 Skill 内部文件结构并进行编辑。

---

## 2. 功能架构

### 2.1 模块树结构 (JSON Representation)

```json
{
  "ConductSystem": {
    "CoreEngine": {
      "LocationResolver": "解析各平台特定路径 (Claude/Codex/Gemini)",
      "Scanner": "识别 SKILL.md 目录及附属资源 (scripts, assets)",
      "Parser": "提取 YAML 元数据 (含 version, license, tools)",
      "Validator": "执行格式校验与路径有效性检查",
      "ConflictAnalyzer": "基于优先级标记被覆盖的同名 Skill"
    },
    "CLIMode": {
      "Commands": ["scan", "codex-scan", "gemini-scan", "list", "validate"],
      "Reporters": ["Terminal (Chalk)", "JSON", "Markdown"]
    },
    "GUIMode": {
      "Layout": {
        "Navigation": "左侧侧边栏 (Dashboard, Installed, Marketplace, Settings)",
        "Content": "动态主视图 (Local Tree / Marketplace Grid)"
      },
      "Modules": {
        "LocalSkills": "树形层级展示 + 详情文件树 + 验证状态",
        "Marketplace": "在线 Skills 发现 + 搜索过滤 + 详情预览 + 一键安装",
        "Settings": "主题、路径配置、偏好设置 + 语言切换"
      }
    }
  }
}
```

---

## 3. 功能详细说明

### 3.1 跨平台扫描逻辑

#### 3.1.1 Claude Code
- **路径**: `~/.claude/skills`, `.claude/skills`, 以及 `packages/*` 等嵌套目录。
- **扩展**: 支持插件目录 `~/.claude/plugins/*/skills`。

#### 3.1.2 Codex
- **路径**: 递归向上扫描父目录 `.codex/skills` 直至仓库根目录。
- **层级**: Repo > User (`~/.codex`) > System (`/etc/codex`)。

#### 3.1.3 Gemini CLI
- **路径**: Workspace (`.gemini/skills`) 与 User (`~/.gemini/skills`)。

### 3.2 数据预取与缓存
- **预加载**: 应用启动时并行调用 Rust 后端接口扫描所有平台。
- **缓存**: 在 Zustand Store 中维护各平台的快照，切换 Tab 时优先从缓存读取，确保 UI 响应。
- **强制刷新**: 点击 Refresh 按钮将清除缓存并重新执行全量扫描。

### 3.3 Marketplace (Skills 市场)
> 详见独立文档: [Marketplace PRD](./prd_marketplace.md)

### 3.4 Skill 安装器
- **Git 支持**: 支持标准的 `.git` 链接。
- **子目录支持**: 特别支持 GitHub `.../tree/main/path/to/skill` 格式的 URL，自动提取子目录安装。
- **安装位置**: 默认安装到当前平台的个人全局目录。
- **跨平台复刻**: 在本地 Skill 详情页可一键复刻到其他 CLI 平台。
  - **复刻策略**: 通过文件复制方式将本地 Skill 目录复刻到目标 CLI 的个人全局目录，不依赖 Git。
  - **目标选择**: 仅允许选择与当前平台不同的目标 CLI。
  - **冲突检测**: 以 Skill `name`（忽略大小写与首尾空格）判断目标平台是否已存在同名 Skill，存在则阻止复刻并提示原因。
  - **路径规则**: 目标目录为 `~/.claude/skills/`、`~/.codex/skills/`、`~/.gemini/skills/` 中对应平台路径。
  - **目录命名**: 复刻后的文件夹名沿用源 Skill 目录名称。
  - **失败提示**: 复刻失败需返回可读错误（如源目录不存在、SKILL.md 缺失、目标目录创建失败、文件复制失败）。
  - **运行日志**: 复刻流程需记录到 `runtime_log.md` 便于排障。
- **重复检测**: 安装前检查目标 CLI 中是否存在同名 Skill，避免重复安装。
- **Git 支持**: 支持标准的 `.git` 链接。
- **子目录支持**: 特别支持 GitHub `.../tree/main/path/to/skill` 格式的 URL，自动提取子目录安装。
- **安装位置**: 默认安装到当前平台的个人全局目录。

### 3.5 详情与文件树
- **文件结构**: 调用后端接口递归读取 Skill 目录，区分文件与文件夹。
- **编辑器联动**: 点击文件名直接调用系统默认编辑器打开，支持快速编辑。
- **复刻技能**: 详情面板新增“复刻技能”按钮，选择目标 CLI 后执行复制安装。

### 3.6 语言与文案管理
- **文案集中管理**: 所有 UI 字符串集中在单一文件维护。
- **中英切换**: Settings 中提供中文/英文切换，界面即时更新。

---

## 4. 技术规格

### 4.1 技术栈
- **Frontend**: React 18, TypeScript, TailwindCSS (Design System), Zustand.
- **Backend**: Tauri (Rust), `tokio` (Async runtime), `serde` (Serialization).
- **Tooling**: Vite, Git (for installation).

### 4.2 性能目标
- **冷启动**: < 2s 呈现首屏。
- **Tab 切换**: < 10ms (缓存命中)。
- **安装时间**: 取决于 Git 网络速度，支持浅克隆优化。

---

## 5. 未来演进
- [ ] **在线市场**: 浏览并一键安装来自公共市场的常用 Skills。
- [ ] **可视化编辑器**: 提供 GUI 表单编辑 YAML 元数据，无需手动编辑 Markdown。
- [ ] **执行日志**: 集成 CLI 的实时日志流，调试 Skill 触发过程。
