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
- `ytx_ad_cleaner.js` —— 广告位响应清理脚本（被插件远程引用）

## 声明

仅供个人学习研究使用，请勿用于商业用途。
