# 发布规则

## 核心目标
- 所有 Conduct macOS 版本通过 `tokenlabs.cn` 承载：下载页 `https://tokenlabs.cn/download.html`、OTA 数据 `https://tokenlabs.cn/updates/latest.json`、安装包和签名都在 `https://tokenlabs.cn/downloads/conduct/v{version}/`。
- GitHub release 仅作为 `.dmg` 的旁加载入口，不再上传源码压缩包（仓库已私有）。
- Landing page 由本地目录 `/Users/ddmm/Develop/TokenLabs/TokenLabsWebsite` 维护，与 release 同步展示。

## OTA 构建流程
1. 本地执行 `npm run version:build && npm run build:tauri`（详细见 `sign_release.md`）以产出 `Conduct.app.tar.gz`, `.sig` 与 `.dmg`。
2. 将 `Conduct.app.tar.gz` 与 `.sig` 拷贝到 tokenlabs 静态目录，如 `https://tokenlabs.cn/downloads/conduct/v0.9.1/`。
3. 生成 `latest.json`，示例：
   ```json
   {
     "version": "0.9.1",
     "notes": "- 客户可通过 tokenlabs.cn/download.html 获取最新版，自动更新通道不再暴露源码。",
     "pub_date": "2026-02-02T12:00:00Z",
     "platforms": {
       "darwin-aarch64": {
         "signature": "<base64(signature)>",
         "url": "https://tokenlabs.cn/downloads/conduct/v0.9.1/Conduct.app.tar.gz"
       }
     }
   }
   ```
   用签名私钥生成的 `.sig` 做 base64 后填入 `signature`，把 `latest.json` 发布到 `https://tokenlabs.cn/updates/latest.json`。
4. 确保 `src-tauri/tauri.conf.json` 中 `tauri.updater.endpoints` 指向上述 `latest.json`、`allowlist.http.scope` 包含 `https://tokenlabs.cn/*`，这样用户启动应用时可拉取更新。

## GitHub Release 规范
- 创建 Release 版本 tag（例如 `v0.9.1`）时，只上传：
  1. `ConductApp/README.md`（介绍用户功能更新）。
  2. `Conduct_<version>_aarch64.dmg`
- `release_notes.md` 记录用户视角的功能改进，发布时可作为 Release note 内容，**禁止写技术方案**。
- 不要附带 `Conduct.app.tar.gz` / `.sig`（OTA 已由 tokenlabs 托管），也不要宣传源码。

## Landing Page 同步
- 每次发布必须同步更新 `/Users/ddmm/Develop/TokenLabs/TokenLabsWebsite/index.html`、`download.html`、`i18n.js`，突出 tokenlabs 下载与 OTA 逻辑。
- 发布后确认 `https://tokenlabs.cn/download.html` 页面展示最新版本号、下载按钮指向新的 `.dmg`，并说明 OTA 使用 `https://tokenlabs.cn/updates/latest.json`。

## 验证
- 通过设置页检查更新：确保新版出现在 `Conduct > Settings > Update` 中，且下载请求走 `tokenlabs.cn/updates/latest.json`。
- 下载 `latest.json`、`.tar.gz`、`.sig`，手动验证内容一致后再推送。

链接：本 README 已用“发布规则”章节指向本文档。
