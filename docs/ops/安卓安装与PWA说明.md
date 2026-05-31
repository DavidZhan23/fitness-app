# 安卓 / 鸿蒙「添加到桌面」说明

## 为什么 iPhone 好用，小米 / 华为却像网页？

| 因素 | iPhone (Safari) | 小米 / 华为等安卓 |
|------|-----------------|-------------------|
| 系统浏览器 | Safari 对「添加到主屏幕」支持成熟 | 自带浏览器常只做**桌面快捷方式**，不是完整 PWA |
| 安装图标 | 支持较好 | 很多桌面**不识别 SVG 图标**，需要 **PNG** |
| 全屏体验 | `standalone` 较稳定 | 依赖浏览器是否真正「安装应用」 |
| HTTPS | 建议 HTTPS | **完整 PWA 安装**在 Chrome 上通常要求 **HTTPS**（纯 IP 的 http 可能只能快捷方式） |

本项目已做：

- 提供 **PNG** 图标（192 / 512）及 **maskable** 图标，改善安卓桌面图标显示
- `manifest` 中 `display: standalone`、主题色等
- 设置页内「添加到手机桌面」说明

**无法保证**所有国产自带浏览器都与 iPhone 一致；**Chrome 安装**是最稳妥方案。

## 用户推荐步骤（安卓）

1. 安装 **Google Chrome**（或系统自带 Chrome）
2. 用 Chrome 打开：`http://你的服务器地址`
3. 菜单 ⋮ → **安装应用** / **添加到主屏幕**
4. 从桌面新图标打开，应无地址栏、有应用图标

## 若仍无图标或像浏览器

1. 删除旧的桌面快捷方式，用 Chrome 重新安装
2. 部署后确认服务器上存在：`/icons/icon-192.png`、`/icons/icon-512.png`
3. 有条件时为站点配置 **HTTPS**（域名 + Let's Encrypt），再安装
4. 避免仅用「小米浏览器 / 华为浏览器」的「添加到桌面」

## 开发者：重新生成 PNG 图标

替换 `public/icons/icon-source.png` 后执行：

```bash
bash scripts/generate-icons.sh
npm run build
npm run deploy:tencent
```

会同步更新 `favicon.ico`、`favicon.svg`（内嵌新图）、各尺寸 PNG，以及 manifest / HTML 中的版本号缓存参数。

## 华为 / 小米桌面仍是旧图标

1. **先删**桌面上旧的快捷方式
2. 浏览器 **清除本站缓存** 后重新打开
3. 若仍不对，用 **Chrome** 的「安装应用」而非自带浏览器「添加到桌面」
4. 自带浏览器可能读 `/favicon.svg` 或创建时缓存旧图；部署新版本后需重新添加

## 进一步升级（可选）

- 为腾讯云配置 **HTTPS** + 域名 → 安卓 PWA 安装成功率最高
- 未来若需要接近原生的推送、支付等，再考虑 Capacitor / 原生壳，成本更高
