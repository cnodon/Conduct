# 实现与规则细节

## 扫描位置规则

### Claude Code
| 位置类型 | 路径 | 优先级 |
|---------|------|-------|
| 个人全局 | `~/.claude/skills/` | 高 |
| 项目级 | `.claude/skills/` | 中 |
| 嵌套目录 | `packages/*/.claude/skills/` | 中 |
| 插件 | `~/.claude/plugins/*/skills/` | 低 |

### Codex
| 位置类型 | 路径 | 优先级 |
|---------|------|-------|
| 当前目录 | `$CWD/.codex/skills/` | 1 (最高) |
| 父级目录 | `../.codex/skills/` (递归向上) | 2 |
| 仓库根目录| `$REPO_ROOT/.codex/skills/` | 3 |
| 用户目录 | `~/.codex/skills/` | 4 |
| 系统目录 | `/etc/codex/skills/` | 5 |

### Gemini CLI
| 位置类型 | 路径 | 优先级 |
|---------|------|-------|
| 工作区 | `.gemini/skills/` | 高 |
| 用户目录 | `~/.gemini/skills/` | 中 |
| 扩展目录 | 插件/扩展捆绑 | 低 |

## 复刻技能实现（本地复制）
- **入口**: Tauri command `install_local_skill`，由 GUI 详情页“复刻技能”触发。
- **源校验**:
  - 确认源目录存在。
  - 读取 `SKILL.md` 并解析 YAML frontmatter，获取 `name`。
- **冲突检测**:
  - 对目标平台执行一次扫描。
  - 以 `name` 的小写+去空格做同名判断，存在则拒绝复刻。
- **目标路径**:
  - Claude: `~/.claude/skills/`
  - Codex: `~/.codex/skills/`
  - Gemini: `~/.gemini/skills/`
  - 目标文件夹名沿用源目录名称。
- **复制策略**:
  - 递归复制目录与文件（保留结构）。
  - 若目标目录不存在则创建。
- **错误返回**:
  - 源目录不存在、`SKILL.md` 缺失或解析失败。
  - 目标平台同名冲突。
  - 创建目标目录失败或复制失败。
- **运行日志**:
  - 复刻流程关键步骤与失败原因写入 `runtime_log.md`。

## 版本写入与编译时间
- `scripts/write-version.mjs` 生成 build 版本并写入应用版本文件。
- 写入位置：`src-tauri/tauri.conf.json` 与 `src/gui/renderer/version.json`。
- 版本格式：`<base>+YYYYMMDD-HHMM`，其中 base 来自 `BASE_VERSION` 环境变量（默认 `1.0.0`）。

## 程序图标配置
- **图标文件**：放在 `src-tauri/icons/`，当前使用 `src-tauri/icons/icon.png`。
- **配置位置**：`src-tauri/tauri.conf.json` 中的 `tauri.bundle.icon`（应用图标）与 `tauri.systemTray.iconPath`（托盘图标）。
- **多平台支持**：已生成 `icons/icon.ico`（Windows）与 `icons/icon.icns`（macOS）并加入 `bundle.icon`。

## GUI 模块结构 (JSON)

```json
{
  "App": {
    "Header": {
      "PlatformTabs": ["Claude Code", "Codex", "Gemini"],
      "ActionButtons": ["+ Add Skill", "Refresh"],
      "GlobalProgressBar": "Top-fixed"
    },
    "MainContent": {
      "LeftPanel": {
        "SkillsTree": {
          "Sections": ["Global", "Project", "Nested", "Extensions"],
          "SkillNodes": ["StatusIcon", "Name", "OverrideIndicator"]
        }
      },
      "RightPanel": {
        "DetailPanel": {
          "InfoCard": ["Name", "Desc", "Version", "License", "Path"],
          "ConfigCard": ["Tools", "Model", "Context", "Hooks"],
          "ValidationCard": ["Errors", "Warnings", "Recommendations"],
          "FileTree": {
            "RecursiveNodes": ["Folder (Expandable)", "File (Open in Editor)"]
          },
          "ActionButtons": ["Open in Editor", "Show in Finder"]
        }
      }
    },
    "AddSkillModal": {
      "Input": "Git URL",
      "Actions": ["Install", "Cancel"]
    },
    "NotificationBar": "Error/Success Toast"
  }
}
```

## 日志（tauri-plugin-log）
- **启用方式**：已集成 `tauri-plugin-log`，Release 版本会写日志到系统日志目录。
- **常见路径**：
  - macOS：`~/Library/Logs/Conduct/`
  - Windows：`%APPDATA%\\Conduct\\logs\\`
