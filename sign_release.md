# Conduct 签名与公证发布流程

本文梳理 macOS 发布所需的签名、公证、更新清单生成与发布步骤，并列出涉及的关键文件。

## 一、准备材料
### 1) Apple 证书
- **Developer ID Application 证书**（必须）
  - 示例文件：`/Users/ddmm/Develop/TokenLabs/dev_certification/developerID_application.cer`
  - 安装后钥匙串中应显示：
    `Developer ID Application: DONG YUAN (9ZF5W6983F)`
  - 要求证书项**包含私钥**（可展开显示）

### 2) Tauri 更新签名密钥（Updater）
- 私钥：`/Users/ddmm/Develop/TokenLabs/dev_certification/tauri_private.key`
- 公钥：`/Users/ddmm/Develop/TokenLabs/dev_certification/tauri_private.key.pub`
- 公钥已写入：`src-tauri/tauri.conf.json` → `tauri.updater.pubkey`

### 3) Apple 公证凭证
- Apple ID：`odoncn@163.com`
- Team ID：`9ZF5W6983F`
- App-specific password：由 appleid.apple.com 生成
- Keychain Profile：`AC_NOTARY`

创建公证凭证（保存到钥匙串）：
```
xcrun notarytool store-credentials "AC_NOTARY" \
  --apple-id "<APPLE_ID>" \
  --team-id "<TEAM_ID>" \
  --password "<APP_SPECIFIC_PASSWORD>"
```

## 二、配置文件
### 1) Tauri 配置
`src-tauri/tauri.conf.json`
- `bundle.macOS.signingIdentity`：
  `Developer ID Application: DONG YUAN (9ZF5W6983F)`
- `bundle.macOS.providerShortName`：
  `9ZF5W6983F`
- `tauri.updater.endpoints`：
  `https://raw.githubusercontent.com/cnodon/Conduct/main/latest.json`
- `tauri.updater.pubkey`：写入 Tauri 更新签名公钥

### 2) 版本控制
`package.json`
- `version` 使用 SemVer（例如 `0.8.3`）

`version.json`（由脚本生成）
- `base`：版本号
- `build`：版本号 + 时间戳

## 三、签名与公证构建流程
### 1) 设置环境变量
```
export TAURI_PRIVATE_KEY=/Users/ddmm/Develop/TokenLabs/dev_certification/tauri_private.key
export TAURI_KEY_PASSWORD=""
export APPLE_ID="odoncn@163.com"
export APPLE_PASSWORD="<APP_SPECIFIC_PASSWORD>"
export APPLE_TEAM_ID="9ZF5W6983F"
```

### 2) 构建
```
npm run version:build
npm run build:tauri
```

构建输出位置：
- DMG：`src-tauri/target/release/bundle/dmg/Conduct_0.8.3_aarch64.dmg`
- Updater 包：`src-tauri/target/release/bundle/macos/Conduct.app.tar.gz`
- Updater 签名：`src-tauri/target/release/bundle/macos/Conduct.app.tar.gz.sig`

> 说明：Tauri 在构建过程中会自动完成签名与公证。

## 四、生成更新清单（latest.json）
更新清单必须使用 **Updater 签名文件** 生成，并上传到公开地址。

示例（darwin-aarch64）：
```json
{
  "version": "0.8.3",
  "notes": "- README 展示团队图片（group.jpg）\n- DMG 已签名并公证，可直接打开",
  "pub_date": "2026-01-30T11:52:59Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "<base64(Conduct.app.tar.gz.sig)>",
      "url": "https://github.com/cnodon/Conduct/releases/download/v0.8.3/Conduct.app.tar.gz"
    }
  }
}
```

发布到：
- `https://raw.githubusercontent.com/cnodon/Conduct/main/latest.json`

## 五、发布到 GitHub Release
需要上传 3 个文件：
1) `Conduct_0.8.3_aarch64.dmg`
2) `Conduct.app.tar.gz`
3) `latest.json`

示例命令：
```
gh release create v0.8.3 \
  /path/to/Conduct_0.8.3_aarch64.dmg \
  /path/to/Conduct.app.tar.gz \
  /path/to/latest.json \
  --repo cnodon/Conduct \
  --title "Conduct v0.8.3" \
  --notes-file /path/to/release_notes.md
```

## 六、验证
- 下载 DMG 打开应不再提示“已损坏”
- 设置页更新检查可正确检测新版本
- `latest.json` 可直接访问并返回 JSON

## 七、关键文件清单
- 证书：`/Users/ddmm/Develop/TokenLabs/dev_certification/developerID_application.cer`
- 证书导出（可选）：`/Users/ddmm/Develop/TokenLabs/dev_certification/developerID_application.p12`
- Tauri 更新私钥：`/Users/ddmm/Develop/TokenLabs/dev_certification/tauri_private.key`
- Tauri 更新公钥：`/Users/ddmm/Develop/TokenLabs/dev_certification/tauri_private.key.pub`
- Tauri 配置：`src-tauri/tauri.conf.json`
- 更新清单：`latest.json`（发布到 GitHub 仓库根目录）
- DMG：`src-tauri/target/release/bundle/dmg/Conduct_0.8.3_aarch64.dmg`
- Updater 包：`src-tauri/target/release/bundle/macos/Conduct.app.tar.gz`
- Updater 签名：`src-tauri/target/release/bundle/macos/Conduct.app.tar.gz.sig`
