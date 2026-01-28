# 设计文档

本目录包含 Conduct 项目的所有设计图和架构图。

## 文件列表

### 1. main-layout.svg
**主界面布局设计**

展示 Conduct GUI 的完整界面布局，包括：
- 顶部 Tabs（Claude Code / Codex）
- 统计面板（总计、正确、警告、错误）
- 左侧 Skills 树（个人全局、项目级、嵌套目录）
- 右侧详情面板（基本信息、元数据、验证结果）
- 操作按钮

**预览:**
```
┌────────────────────────────────────────┐
│  Conduct  [Claude Code] [Codex]        │
├────────────────────────────────────────┤
│  📊 统计面板                           │
├──────────────────┬─────────────────────┤
│  Skills 树       │  详情面板           │
│  🌐 个人全局     │  • 基本信息         │
│  📁 项目级       │  • 元数据配置       │
│    📂 嵌套目录   │  • 验证结果         │
│  🔌 插件         │  • 操作按钮         │
└──────────────────┴─────────────────────┘
```

---

### 2. architecture.svg
**系统架构设计**

展示 Conduct 的技术架构，包括：
- Tauri Backend（Rust）
  - Command Handler
  - Core Engine (Scanner, Parser, Validator, Reporter)
- Webview Renderer（React）
  - Header & Tabs
  - Statistics Panel
  - Skills Tree & Detail Panel
- Command 通信机制

**架构分层:**
```
┌─────────────────────────────────┐
│  Tauri Backend (Rust)           │
│  ┌──────────┐  ┌──────────────┐ │
│  │ Commands │  │ Core Engine  │ │
│  └──────────┘  └──────────────┘ │
└────────────┬────────────────────┘
             │ Command Bridge
┌────────────▼────────────────────┐
│  Webview Renderer (React)       │
│  ┌──────────────────────────┐   │
│  │  React Application       │   │
│  │  • Header & Tabs         │   │
│  │  • Statistics Panel      │   │
│  │  • Skills Tree           │   │
│  │  • Detail Panel          │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

---

### 3. dataflow.svg
**数据流程图**

展示从启动到渲染的完整数据处理流程：

1. **启动应用** → conduct gui
2. **Location Resolver** → 解析 Skills 位置
3. **Scanner** → 扫描所有位置
4. **Parser** → 解析 SKILL.md
5. **Validator** → 验证配置
6. **Conflict Analyzer** → 分析冲突
7. **Tree Data Builder** → 构建树形数据
8. **GUI 渲染** → 显示界面

**实时更新循环:**
- File Watcher 监听文件变更
- 触发重新扫描（步骤 2-6）
- 更新 UI
- 继续监听

**流程图:**
```
[启动]
  ↓
[Location Resolver]
  ↓
[Scanner]
  ↓
[Parser]
  ↓
[Validator]
  ↓
[Conflict Analyzer]
  ↓
[Tree Data Builder]
  ↓
[GUI 渲染]

  ┌─────────────┐
  │ File Watcher│←─┐
  └──────┬──────┘  │
         ↓         │
  [重新扫描]       │
         ↓         │
  [更新 UI]────────┘
```

---

## 使用说明

### 查看 SVG 文件

**方法 1: 浏览器**
- 直接拖拽 SVG 文件到浏览器窗口

**方法 2: VSCode**
- 安装 "SVG" 扩展
- 右键 SVG 文件 → "Open Preview"

**方法 3: GitHub**
- 推送到 GitHub 后自动渲染

### 编辑 SVG 文件

**推荐工具:**
- [Figma](https://figma.com) - 专业设计工具
- [draw.io](https://app.diagrams.net/) - 免费在线绘图工具
- [Inkscape](https://inkscape.org/) - 开源矢量图形编辑器
- VSCode + SVG 扩展 - 直接编辑 SVG 代码

---

## 设计规范

### 颜色方案

**主色调:**
- 蓝色 `#1890ff` - 主要操作、链接
- 绿色 `#52c41a` - 成功、正确
- 黄色 `#faad14` - 警告
- 红色 `#ff4d4f` - 错误、危险
- 紫色 `#722ed1` - 次要强调

**中性色:**
- `#262626` - 主文字
- `#595959` - 次要文字
- `#8c8c8c` - 辅助文字
- `#d9d9d9` - 边框
- `#f5f5f5` - 背景

### 图标

- 🌐 个人全局 Skills
- 📁 项目级 Skills
- 📂 嵌套目录
- 🔌 插件
- 🏢 企业级
- ✅ 配置正确
- ⚠️ 警告
- ❌ 错误
- 🔄 被覆盖

### 字体

- 标题: Arial Bold, 18-24px
- 正文: Arial Regular, 12-14px
- 代码: Monospace, 12px

---

## 维护说明

### 更新设计图

1. 修改 SVG 源文件
2. 确保与 prd.md 中的描述保持一致
3. 提交 Git 时注明变更内容

### 添加新设计图

1. 在 design/ 目录创建新 SVG 文件
2. 使用统一的颜色方案和字体
3. 在本 README 中添加说明
4. 在 prd.md 中引用

---

## 相关文档

- [产品需求文档 (PRD)](../prd.md)
- [技术实现方案](../scenario.md)
- [项目 README](../README.md)

---

**最后更新:** 2026-01-19
