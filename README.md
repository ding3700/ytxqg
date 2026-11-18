# 悦通行去广告 Loon 插件

针对 **悦通行**（地铁乘车码 / 互通乘车 APP，域名 `*.ifbapp.com` / `*.110route.cn`）的 Loon 去广告插件。

## 功能

- 去除**开屏广告**、首页**弹窗广告**、**Banner / 信息流广告位**
- 屏蔽**百合广告 SDK**（`*.baihemob.com`）
- 屏蔽 **CPC 广告配置**（`cpc-service-square.iggrowth.cn` / `*.yunxish.com`）
- 屏蔽自家埋点打点（`yzapp-hit.110route.com/dot.gif`）
- **不影响**乘车码、定位、扫码、支付、消息等核心功能

## 原理

基于抓包分析：

| 接口 / 域名 | 作用 | 处理方式 |
|---|---|---|
| `v.110route.cn/go/ytx/index/tagad` / `tagadall` | 悦通行自有广告位配置（开屏、弹窗、Banner） | MITM 后用 JS 把所有广告位 `state/status` 置 0、`sync/async` 清空，App 判定无广告 |
| `ad.baihemob.com` / `inner.baihemob.com` | 百合第三方广告 SDK | REJECT |
| `cpc-service-square.iggrowth.cn` / `cpc-service-square.yunxish.com` | CPC 广告配置拉取 | REJECT |
| `api.yunxish.com` / `service.yunxish.com` / `logrcv.yunxish.com` / `usr-api.yunxish.com` / `tracelog-debug.yunxish.com` | 云析广告/统计/日志上报 | REJECT |
| `yzapp-hit.110route.com` | 自家埋点 `dot.gif` | REJECT |
| `static.shunchangzhixing.com` | 第三方监控 JS | REJECT |

## 安装

1. 复制下面的订阅链接：

   ```
   https://raw.githubusercontent.com/ding3700/ytxqg/main/ytxqg.plugin
   ```

2. Loon → **插件** → 右上角 **+** → **从 URL 导入** → 粘贴链接。

3. 启用插件。**MITM 需开启**（Loon 会自动按插件内 `[MITM]` 配置挂载证书；如未安装过 Loon 证书，请按提示安装并信任）。

## 文件说明

- `ytxqg.plugin` —— Loon 插件主配置
- `ytx_ad_cleaner_v2.js` —— 广告位响应清理脚本（插件实际引用此文件）
- `ytx_ad_cleaner.js` —— 与 v2 内容一致，仅作旧链接兼容

## 常见问题

### 开屏广告还在？

该接口的响应体是 **base64 包裹的 JSON**（以 `eyJjb2RlIjow` 开头），不是明文 JSON。若脚本按明文解析会直接失败并放行原始内容，表现就是"插件加载正常但广告照旧"。v2 脚本已同时兼容 base64 与明文两种格式，并保持原格式回写。

排查顺序：

1. **确认 MITM 生效**：Loon → 设置 → MITM 证书已安装，且系统"设置 → 通用 → 关于本机 → 证书信任设置"里已信任 Loon。不开 MITM 时 `http-response` 脚本不会执行（第三方 REJECT 规则仍有效）。
2. **清掉 App 里已缓存的广告配置**：iOS 设置 → 悦通行 → 清除数据/缓存，或直接卸载重装。旧的开屏素材可能已落盘，第一次启动仍会闪一下。
3. **更新插件**：插件页下拉或点右上角刷新，让 Loon 重新拉取脚本。
4. 若仍无效，可在 `[URL Rewrite]` 里临时加一行 `^https?://v\.110route\.cn/go/ytx/index/ REJECT` 直接掐断广告接口（副作用：开屏可能白屏等待超时，属于兜底方案）。

## 声明

仅供个人学习研究使用，请勿用于商业用途。
