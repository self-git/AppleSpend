# AppleSpend

一个本地优先的 Apple 生态消费账本与资产分析工具。

AppleSpend 用来解析 Apple 数据与隐私导出的 CSV 文件，帮助你回看这些年在 Apple 生态中的真实支出、账单项目价值、设备资产、订阅消费和 Store Credit 流转。它不是通用记账软件，而是一个专门为 Apple 账单场景设计的个人数据看板。

## 项目定位

这个项目的目标，是把 Apple 生态里分散在不同导出文件中的消费记录，整理成一套口径清晰、可追溯、可视化的个人账本：

- Apple Store 硬件消费：iPhone、iPad、Mac、Apple Watch、AirPods、配件、AppleCare 等
- App Store 消费：App、内购、订阅、iCloud、Apple Music、服务项目等
- Store Credit 流转：区分现金充值与余额消费，避免重复统计
- 设备资产沉淀：从硬件订单自动生成资产卡片，持续维护状态
- 全程本地处理：CSV 只在浏览器本地解析并写入 IndexedDB，不上传账单数据

## 当前能力

目前仓库已经实现了一套可运行的 V1 前端版本，核心能力包括：

- 本地导入 Apple CSV
  支持 `Store Transaction Purchase and Free Apps History.csv` 与 `Online Purchase History.csv`
- Dashboard 总览
  展示实际现金支出、硬件支出、软件/订阅支出、账单项目价值、免费项目数量、年度趋势、类别占比、支付方式和 Store Credit 统计
- Ledger 明细账本
  支持搜索、按年份/类别/来源/支付方式筛选，区分现金、非现金、免费和退款，并可导出当前筛选结果
- Assets 设备资产页
  从 Apple Store 硬件订单自动生成资产卡片，展示购买价格、使用时长、月均成本、订单号，并支持维护使用状态
- 本地数据管理
  支持增量导入、替换全部、清空本地数据，并记录最近一次导入批次和数据质量提示

## 统计口径

AppleSpend 强调“真实支出”和“账单价值”分开统计，避免 Apple 数据导出里常见的重复计算问题。

- 实际现金支出
  只统计真正影响现金流出的交易
- Store Credit 消费
  不重复计入现金支出，但会计入账单项目价值
- 免费 / 限免项目
  默认不计入支出，但会保留记录用于回看领取历史
- 退款
  按净额从支出中扣除
- 金额计算
  使用 `decimal.js` 聚合，避免浮点误差

这套口径尤其适合回答几个很实际的问题：

- 我这些年在 Apple 总共花了多少钱？
- 硬件和软件/订阅分别占多少？
- 哪些消费是真金白银，哪些只是余额流转？
- 我买过哪些设备，它们现在还在不在用？

## 技术栈

- Vue 3
- Vite
- TypeScript
- Tailwind CSS
- Element Plus
- Pinia
- Vue Router
- PapaParse
- decimal.js
- dayjs
- ECharts
- Dexie

## 快速开始

### 1. 安装依赖

项目使用 `pnpm`：

```bash
pnpm install
```

### 2. 启动开发环境

```bash
pnpm dev
```

默认会启动在本地地址：

```bash
http://127.0.0.1:5180
```

开发环境已接入 `@xiaou66/vite-plugin-vue-mcp-next`。启动后可通过下面的 Streamable HTTP 地址连接项目级 MCP：

```bash
http://127.0.0.1:5180/__mcp/mcp
```

### 3. 构建生产版本

```bash
pnpm build
```

### 4. 类型检查

```bash
pnpm typecheck
```

## 使用方式

1. 从 Apple 下载你的数据与隐私导出文件
2. 找到项目当前支持的两个 CSV：
   `Store Transaction Purchase and Free Apps History.csv`
   `Online Purchase History.csv`
3. 打开导入页，拖入文件或手动选择
4. 先看 Dashboard 了解整体支出，再到 Ledger 查明细，到 Assets 看设备资产

如果你有多年数据，推荐先导入软件交易 CSV，再导入硬件订单 CSV；也可以一次选中两个文件一起导入。

## 页面结构

### Dashboard

首页以“这些年在 Apple 生态中的实际现金支出”为核心指标，围绕它展开年度趋势、类别占比、支付方式、Store Credit 和高额消费记录。

### Ledger

账本页强调“像查账一样回溯每一笔”。主表保持干净，原始 CSV 字段和更完整信息放在详情抽屉中，适合筛选、核对和导出。

### Assets

资产页把 Apple Store 硬件订单转成设备卡片，让消费不只是账单，也变成设备生命周期记录。

## 设计方向

项目视觉方向参考 Apple 官网式的高级极简风格，强调：

- 大数字与清晰层级
- 克制留白和浅色界面
- 精准而不过度装饰的图表
- 更像 Apple 数据工具，而不是通用后台管理系统

仓库中已经包含一套 Apple 风格的基础组件、设计 token 和设备示意素材，位于 `src/components`、`src/styles` 和 `public/apple-assets/`。

## 当前限制

- V1 目前只支持 CSV，不支持直接导入 ZIP
- 数据以本地浏览器存储为主，尚未提供云同步
- 目前以单用户本地使用为目标，不涉及账户系统
- 某些 Apple 导出字段在不同地区或时间版本中可能存在命名差异，仍需要逐步兼容

## 后续方向

- 支持 Apple 导出 ZIP 自动识别与解包
- 增加年度报告导出能力
- 更完整的资产生命周期管理
- 更细粒度的订阅识别与汇总
- 桌面端封装（例如 Tauri）

## 仓库说明

- 入口文件：[`src/main.ts`](src/main.ts)
- 路由配置：[`src/app/router.ts`](src/app/router.ts)
- 主分支启用了保护规则，协作提交请通过 Pull Request 并使用已验证签名
- 本仓库推荐使用 `pnpm` 安装依赖和运行本地脚本

如果你也在整理自己的 Apple 消费历史，希望这个项目能帮你把“买过什么、花了多少、哪些还在用”这三件事讲清楚。
