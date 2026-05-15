# Apple 消费账本实现计划

## 1. 项目定位

构建一个本地优先的 Apple 生态消费分析工具，用来解析 Apple 数据与隐私导出的 CSV / ZIP 文件，自动统计这些年在 Apple 相关场景中的真实支出、账单项目价值、设备资产、订阅与 Store Credit 流转。

目标不是做通用记账软件，而是做一个专门服务于 Apple 生态数据的个人财务与资产看板：

- Apple Store 硬件消费：iPhone、iPad、Mac、Apple Watch、AirPods、配件、AppleCare 等。
- App Store 消费：App、内购、订阅、iCloud、Apple Music、礼品卡 / Store Credit。
- 统计口径清晰：区分实际现金支出、余额消费、免费 / 限免项目、退款。
- 数据本地处理：CSV 在浏览器或本地桌面端解析，避免上传隐私账单。

## 2. 技术栈建议

第一版建议先做纯前端本地应用，后续第二版再升级为桌面端。

### V1 技术栈

- Vue 3
- Vite
- TypeScript
- TailwindCSS
- Element Plus
- Pinia
- Vue Router
- PapaParse：CSV 解析
- decimal.js：金额精确计算
- dayjs：日期处理
- ECharts：图表
- Dexie：IndexedDB 本地存储

### V2 可选增强

- Tauri：打包为桌面应用，支持读取本地文件夹与 ZIP。
- JSZip：浏览器端解析 Apple 导出的 ZIP。
- VueUse：提升文件拖拽、存储、响应式工具能力。
- Fuse.js：本地模糊搜索消费明细。
- html2canvas / Playwright / 服务端脚本：导出年度报告图片或 PDF。

## 2.1 设计风格与推荐 Skills

项目视觉目标采用“苹果官网启发”的高级极简风格，并允许在个人本地项目中使用 Apple 官网产品图、设备图和相关视觉素材来提升真实感。整体应该像 Apple 官网的数据工具版本：克制、清晰、高质感、强调大数字、留白、精确排版和顺滑动效。

### 设计方向

- 关键词：高级极简、精密、安静、清晰、硬件质感、数据叙事。
- 主色：白、近黑、浅灰、石墨灰，少量高饱和强调色用于图表。
- 字体：优先使用系统字体栈，匹配 Apple 平台体验：`-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif`。
- 布局：大面积留白、清晰分区、强数字层级、横向滚动少、卡片克制。
- 动效：轻量、自然、短时长，适合金额变化、筛选切换、页面进入和图表过渡。
- 图表：少装饰，强调趋势、占比和对比，不使用花哨渐变堆叠。
- 组件：Element Plus 只作为基础交互层，视觉上通过 Tailwind 和 CSS 变量定制成更接近 Apple 官网的质感。

### 已搜索到的相关 Skills

#### 主设计：`anthropics/skills@frontend-design`

链接：`https://skills.sh/anthropics/skills/frontend-design`

安装命令：

```bash
npx skills add https://github.com/anthropics/skills --skill frontend-design
```

适用原因：

- 定位是生成有审美完成度的生产级前端界面，能避免默认 SaaS 后台味。
- 支持 Vue / HTML / CSS / JS 等前端实现，不局限于 React。
- 强调先确定视觉方向，再写页面，适合本项目的 Apple-like 设计要求。
- 对 typography、color、motion、spatial composition 有明确指导。

使用建议：

- 作为 V1 的主设计 skill。
- 用它先产出 Design System，而不是直接生成完整页面。
- Dashboard、Ledger、Assets 三个页面都要沿用同一套视觉规则。
- 约束提示词中明确写入：`Apple 官网启发`、`高级极简`、`大数字`、`大留白`、`不要后台管理系统感`、`可以使用 Apple 产品图作为个人本地素材`。

#### 设计系统增强：`jwynia/agent-skills@frontend-design`

链接：`https://skills.sh/jwynia/agent-skills/frontend-design`

安装命令：

```bash
npx skills add https://github.com/jwynia/agent-skills --skill frontend-design
```

适用原因：

- 支持 Vue、Tailwind、CSS Modules 等前端形式。
- 能生成设计 token、颜色、字体、组件规范。
- 支持分析已有 CSS、提取 tokens、检查可访问性。
- 更适合这个项目的“先定义 Apple-like 设计系统，再落地 Vue 组件”的需求。

使用建议：

- V1 开始前用它定义 `apple-ledger` 的设计 tokens。
- 输出 Tailwind 主题扩展、CSS variables、组件视觉规范。
- 对 Dashboard、Ledger、Assets 三个核心页面做视觉一致性检查。

#### 质量审查：`vercel-labs/agent-skills@web-design-guidelines`

链接：`https://skills.sh/vercel-labs/agent-skills/web-design-guidelines`

安装命令：

```bash
npx skills add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines
```

适用原因：

- 适合在页面写完后做 UI 质检，而不是主导视觉风格。
- 可用于检查信息层级、可访问性、焦点态、响应式和表单体验。
- 能帮助发现“看起来像后台系统”“只靠颜色表达状态”“移动端不可用”等问题。

使用建议：

- Milestone 4 完成 Dashboard 后执行一次审查。
- Milestone 5 完成 Ledger 后重点检查表格、筛选器、键盘焦点和详情抽屉。
- Milestone 6 完成 Assets 后重点检查卡片密度、状态表达和移动端布局。

#### 已本地可用：`frontend-design`

路径：`/Users/wwdd/.agents/skills/frontend-design/SKILL.md`

适用原因：

- 当前环境已经安装，无需再安装。
- 适合在真正实现 Vue 页面时触发，用于避免普通后台管理系统质感。
- 能指导生产级界面、布局、动效和视觉完成度。

使用建议：

- V1 页面开发时默认使用。
- 将美术方向固定为“Apple 官网启发的 refined precision”，避免跑向通用 SaaS 后台风格。

#### 补充：`sergiodxa/agent-skills@frontend-tailwind-best-practices`

链接：`https://skills.sh/sergiodxa/agent-skills/frontend-tailwind-best-practices`

安装命令：

```bash
npx skills add https://github.com/sergiodxa/agent-skills --skill frontend-tailwind-best-practices
```

适用原因：

- 适合约束 Tailwind 写法，减少组件样式混乱。
- 可作为 Tailwind 布局、响应式和颜色使用的规范补充。

使用建议：

- 如果项目开始出现大量重复 class、响应式断点不一致、组件间距混乱，再安装使用。
- 不作为首选设计 skill，而作为工程规范补充。

#### 可选：`rand/cc-polymath@discover-frontend`

链接：`https://skills.sh/rand/cc-polymath/discover-frontend`

安装命令：

```bash
npx skills add https://github.com/rand/cc-polymath --skill discover-frontend
```

适用原因：

- 更像前端技能索引，覆盖组件、状态、可访问性、性能等方向。
- 对 React / Next.js 支持更明显，但其中可访问性、性能和前端架构思路仍有参考价值。

使用建议：

- V2 做性能优化、可访问性审查、复杂状态管理时再考虑。
- 当前 Vue3 + Element Plus 项目不必优先安装。

#### 可选：`avimaybee/mute.@frontend-design`

链接：`https://skills.sh/avimaybee/mute./frontend-design`

安装命令：

```bash
npx skills add https://github.com/avimaybee/mute. --skill frontend-design
```

适用原因：

- 强调 Refined Precision、Interactive Depth、Immersive Kinetic 三档视觉强度。
- 其中 Refined Precision 很适合工具型 Dashboard，接近 Apple 官网式留白、排版和轻动效。

使用建议：

- 如果后续想做更强的官网式首页、年度报告长页或视觉叙事页，可以参考。
- V1 不需要同时安装多个 frontend-design，避免风格指令冲突。

#### 可选：`nextlevelbuilder/ui-ux-pro-max-skill@ui-ux-pro-max`

链接：`https://skills.sh/nextlevelbuilder/ui-ux-pro-max-skill/ui-ux-pro-max`

安装命令：

```bash
npx skills add https://github.com/nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max
```

适用原因：

- 适合做视觉方向探索、色板、字体搭配、图表类型和 UX 方案发散。
- 但它比较大而全，容易把当前明确的 Apple-like 风格带偏。

使用建议：

- 不作为 V1 主 skill。
- 只在需要生成 2-3 套高级极简视觉方向草案时使用。
- 使用时必须明确禁止玻璃拟态、霓虹、赛博、过度渐变和复杂装饰。

### Skill 使用结论

推荐组合：

1. 主设计：使用 `frontend-design`，目标是先生成 Apple-like Design System，再落 Dashboard。
2. 质量审查：页面完成后使用 `web-design-guidelines` 做可访问性、焦点态、响应式和层级审查。
3. Tailwind 维护：样式复杂后再补充 `frontend-tailwind-best-practices`，用于减少重复 class 和硬编码。
4. 设计系统增强：如需要 token 生成、CSS 分析和组件模板，再安装 `jwynia/agent-skills@frontend-design`。
5. 暂不引入 React / Next.js 倾向明显的 frontend gateway skill，除非 V2 做专项可访问性或性能优化。
6. 不要同时让多个设计型 skill 主导同一页面，避免视觉指令互相打架。

### Apple-like 视觉验收标准

- 首屏像消费数据产品，而不是后台管理系统首页。
- 大数字有足够视觉重量，金额、年份、类别一眼可扫。
- Dashboard 不能堆满卡片；每个模块要有清晰的信息优先级。
- Ledger 表格要像 Apple 订单页和银行流水的结合：干净、密度适中、筛选明确。
- Assets 页面要像 Apple 产品陈列：设备名称、购买时间、价格和状态清晰，可以使用 Apple 官网产品图或设备图增强真实感。
- 移动端优先保证指标与筛选可用，不强行复刻桌面布局。
- 深色模式可以作为 V2 增强，但 V1 先做好浅色 Apple-like 风格。
- 不要用 8 个等权后台指标卡堆满首屏，必须有一个明确的 Hero Metric。
- 蓝色只用于链接、CTA、选中态和少数重点数据，不作为大面积装饰色。
- 图表和状态不能只依赖颜色表达，必须有文字、标签、图形或位置辅助。
- Element Plus 的默认后台视觉需要被 Tailwind / CSS variables 覆盖。

### 官方参考与素材使用

参考来源：

- Apple Human Interface Guidelines：`https://developer.apple.com/design/human-interface-guidelines`
- Apple Design Resources：`https://developer.apple.com/design/resources/`
- Apple Fonts：`https://developer.apple.com/fonts/`
- SF Symbols：`https://developer.apple.com/sf-symbols/`

使用原则：

- 这个项目是个人本地消费统计工具，可以使用 Apple 官网产品图、设备图和相关素材来匹配真实设备资产。
- 素材优先用于 Assets 页面、年度报告和设备详情，不要把图片堆进 Dashboard 影响数据阅读。
- Apple 官网素材建议本地缓存到项目的 `public/apple-assets/` 或 `src/assets/apple/`，并在素材清单中记录来源页面和下载时间。
- 对于没有合适官方图的设备，可以先用抽象设备轮廓或线性图标占位。
- 如果未来要公开发布、部署到公网或开源分发，再单独做素材授权与替换评估。

### Apple 图片素材管理

建议目录：

```text
public/
  apple-assets/
    manifest.json
    iphone/
    ipad/
    mac/
    watch/
    airpods/
    accessories/
```

`manifest.json` 示例：

```json
[
  {
    "id": "iphone-11-white-256gb",
    "category": "iPhone",
    "matchKeywords": ["IPHONE 11", "WHITE", "256GB"],
    "file": "/apple-assets/iphone/iphone-11-white.png",
    "sourceUrl": "https://www.apple.com/",
    "downloadedAt": "2026-05-14",
    "note": "个人本地项目素材"
  }
]
```

使用规则：

- 资产卡片根据 `Description`、设备类别和关键词匹配图片。
- 一台设备可以没有图片，缺图时使用默认轮廓占位。
- 图片不进入交易明细主表，避免 Ledger 页面变重。
- Dashboard 只在需要营造 Apple-like 氛围时使用极少量背景或产品图，不影响数字和图表阅读。
- V2 可增加“素材管理”页面，支持手动为设备选择图片。

### Apple-like Design System 先行

第一版不要直接写 Dashboard 页面，应先建立一套小型 Design System。建议先产出这些文件：

```text
src/styles/tokens.css
tailwind.config.ts
src/components/ui/AppleCard.vue
src/components/ui/AppleMetric.vue
src/components/ui/AppleButton.vue
src/components/ui/ApplePageHeader.vue
src/components/ui/AppleSegmentedControl.vue
src/components/ui/AppleSectionTitle.vue
src/components/ui/AppleDataBadge.vue
src/components/ui/AppleReveal.vue
```

#### Tailwind token 建议

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        apple: {
          blue: '#0071e3',
          black: '#1d1d1f',
          gray: '#86868b',
          bg: '#f5f5f7',
          card: '#fbfbfd',
          line: 'rgba(0, 0, 0, 0.08)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        hero: ['80px', { lineHeight: '0.95', letterSpacing: '-0.04em' }],
        display: ['56px', { lineHeight: '1', letterSpacing: '-0.035em' }],
        headline: ['40px', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        title: ['28px', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        apple: '28px',
        'apple-lg': '36px',
        'apple-xl': '44px',
      },
      boxShadow: {
        apple: '0 18px 60px rgba(0, 0, 0, 0.08)',
        'apple-soft': '0 8px 30px rgba(0, 0, 0, 0.06)',
      },
    },
  },
}
```

#### 基础组件职责

| 组件 | 职责 |
| --- | --- |
| `AppleCard.vue` | 页面中的克制容器，统一圆角、背景、边界、内边距和 hover 反馈 |
| `AppleMetric.vue` | 大数字指标，支持主指标、次指标、趋势变化和说明文案 |
| `AppleButton.vue` | 蓝色 CTA、文本链接按钮、次级胶囊按钮 |
| `ApplePageHeader.vue` | 页面标题、说明、时间范围筛选和主要操作 |
| `AppleSegmentedControl.vue` | 统计口径切换，如实际现金支出 / 账单项目价值 / 包含免费项目 |
| `AppleSectionTitle.vue` | 区块标题和说明，控制页面节奏 |
| `AppleDataBadge.vue` | 支付方式、来源、状态、统计口径标签 |
| `AppleReveal.vue` | 轻量进入动效，统一透明度、位移和 duration |

#### 禁止事项

- 不做传统管理后台的左侧深色菜单 + 顶部面包屑布局。
- 不把所有指标做成同尺寸网格卡片。
- 不滥用渐变、玻璃拟态、霓虹、紫蓝色背景和厚重阴影。
- 不在主界面展示原始 CSV 字段，原始字段只进详情抽屉。
- 不使用过多图标解释概念，优先靠文字、数字和布局层级表达。
- 不让 Element Plus 默认表格、按钮、分页样式直接裸露在最终界面。

## 3. 当前数据源

### 3.1 App Store / 媒体服务账单

核心文件：

`Apple_Media_Services/Stores Activity/Account and Transaction History/Store Transaction Purchase and Free Apps History.csv`

用途：

- 统计 App、内购、订阅、iCloud、Apple Music、礼品卡等账单。
- 判断免费 / 限免项目。
- 判断支付方式。
- 统计退款与净支出。

关键字段：

| 字段 | 用途 |
| --- | --- |
| `Item Purchased Date` | 购买时间 |
| `Content Type` | 内容类型，如 App、In-App Purchases、Subscription |
| `Item Description` | 商品或订阅名称 |
| `Container Description` | 所属 App 或服务 |
| `Invoice Item Total` | 商品账单金额 |
| `Refund Amount` | 退款金额 |
| `Order Number` | 订单号 |
| `Payment Type` | 支付方式，如 Alipay、Douyin Pay、Store Credit |
| `Currency` | 币种 |

辅助文件：

- `Subscription History.csv`：订阅生命周期、开通、关闭、续订状态。
- `Billing Payment and Commerce Projection.csv`：支付侧账单记录，可用于交叉核对。
- `Apple Pay Billings.csv`：支付行为记录，可作为补充。
- `Store Credit  Transaction History.csv`：Store Credit 余额流水。

### 3.2 Apple Store 硬件订单

核心文件：

`../Apple.com 和 Apple Store 商店/Transaction History/Online Purchase History.csv`

用途：

- 统计 iPhone、iPad、Mac、Apple Watch、AirPods、配件等硬件购买。
- 生成设备资产列表。
- 计算设备使用年限、月均成本、日均成本。

关键字段：

| 字段 | 用途 |
| --- | --- |
| `Customer Order Number` | Apple Store 订单号 |
| `Order Date` | 下单日期 |
| `Line Item` | 订单行 |
| `Description` | 商品描述 |
| `Qty` | 数量 |
| `Currency` | 币种 |
| `Price Including Tax` | 含税金额 |
| `Payment Method` | 支付方式 |

注意：

- 当前文件中存在重复订单行，需要去重。
- 当前文件末尾存在空白汇总行，需要排除。
- 硬件统计不能简单对所有行求和。

### 3.3 AppleCare / 维修服务

候选文件：

- `../AppleCare/AppleCare/AppleCare Repairs and Service/AppleCare Repairs and Service.csv`
- `../AppleCare/AppleCare/AppleCare Support/AppleCare Cases.csv`

用途：

- 补充设备维修、支持、服务历史。
- 关联硬件资产，形成设备生命周期。

## 4. 核心统计口径

### 4.1 实际现金支出

用于回答“我真实花出去了多少钱”。

规则：

- 计入：`Payment Type = Alipay`、`Douyin Pay`、信用卡等真实付款方式。
- 不重复计入：`Payment Type = Store Credit`。
- 礼品卡 / Store Credit 充值如果支付方式是 Alipay 或 Douyin Pay，应计入现金支出。
- 后续 Store Credit 消费只展示去向，不再次计入现金支出。
- 退款从净额中扣除。

### 4.2 账单项目价值

用于回答“我买过的付费项目总价值是多少”。

规则：

- 计入所有 `Invoice Item Total > 0` 的项目。
- 包含 Store Credit 消费。
- 可单独展示退款前总额与退款后净额。

### 4.3 免费 / 限免项目

用于回答“我领取过哪些免费 App 或限免项目”。

规则：

- `Invoice Item Total = 0` 视为免费、限免、试用或未实际扣款项目。
- 默认不计入支出。
- 可在消费明细中通过开关显示。

### 4.4 硬件订单净额

规则：

- 排除 `Description` 和 `Customer Order Number` 都为空的汇总行。
- 按 `Customer Order Number + Line Item + Description + Price Including Tax` 去重。
- 使用 `Price Including Tax * Qty` 作为订单行金额。
- 后续如发现退货、折抵、维修收费字段，再补充净额规则。

## 5. 数据模型设计

### 5.1 统一交易模型

```ts
export type AppleTransactionSource =
  | 'apple_store'
  | 'app_store'
  | 'subscription'
  | 'store_credit'
  | 'applecare'

export interface AppleTransaction {
  id: string
  source: AppleTransactionSource
  date: string
  title: string
  subtitle?: string
  category: string
  amount: string
  currency: string
  paymentMethod?: string
  orderNumber?: string
  rawType?: string
  cashImpact: boolean
  billValueImpact: boolean
  isFree: boolean
  isRefund: boolean
  duplicateGroupKey?: string
  raw: Record<string, string>
}
```

说明：

- `amount` 使用字符串存储，计算时交给 decimal.js。
- `cashImpact` 表示是否计入实际现金支出。
- `billValueImpact` 表示是否计入账单项目价值。
- `raw` 保留原始 CSV 行，方便排查解析问题。

### 5.2 硬件资产模型

```ts
export type AppleAssetCategory =
  | 'iPhone'
  | 'iPad'
  | 'Mac'
  | 'Apple Watch'
  | 'AirPods'
  | 'AppleCare'
  | 'Accessory'
  | 'Software'
  | 'Other'

export interface AppleAsset {
  id: string
  name: string
  category: AppleAssetCategory
  purchaseDate: string
  purchasePrice: string
  currency: string
  orderNumber: string
  sourceTransactionId: string
  status: 'using' | 'sold' | 'retired' | 'gifted' | 'unknown'
  note?: string
}
```

### 5.3 导入批次模型

```ts
export interface ImportBatch {
  id: string
  importedAt: string
  sourceName: string
  files: ImportedFileSummary[]
  parserVersion: string
  warnings: ImportWarning[]
}

export interface ImportedFileSummary {
  path: string
  type: string
  rowCount: number
  parsedCount: number
  skippedCount: number
}

export interface ImportWarning {
  level: 'info' | 'warning' | 'error'
  message: string
  filePath?: string
  rowNumber?: number
}
```

## 6. 第一版实现计划

### 6.1 V1 目标

做出一个可用的本地 Web App，解决最核心的问题：

- Apple 生态总共实际花了多少钱。
- 硬件和软件分别花了多少钱。
- 哪些是免费 / 限免，不计入实际支出。
- Store Credit 不重复计算。
- 能查看完整消费明细。

### 6.2 V1 范围

#### 必做

- 支持上传 / 选择两个核心 CSV：
  - `Store Transaction Purchase and Free Apps History.csv`
  - `Online Purchase History.csv`
- 解析 App Store 消费记录。
- 解析 Apple Store 硬件订单。
- App Store 账单统计：
  - 实际现金支出
  - 账单项目价值
  - Store Credit 消费
  - 免费 / 限免项目数量
  - 按 `Content Type` 分类汇总
  - 按支付方式汇总
- Apple Store 硬件统计：
  - 排除汇总行
  - 去重订单行
  - 按设备类别汇总
  - 按年份汇总
- 总览 Dashboard。
- 消费明细表。
- 基础筛选：
  - 年份
  - 类别
  - 来源
  - 支付方式
  - 是否计入现金支出
- 本地 IndexedDB 保存导入结果。

#### 暂不做

- 不做登录。
- 不做云同步。
- 不做多用户。
- 不做复杂预算功能。
- 不做自动读取系统文件夹，先通过上传文件实现。
- 不做 PDF 报告导出。

### 6.3 V1 页面结构

#### `/import` 数据导入

功能：

- 拖拽上传 CSV。
- 自动识别文件类型。
- 显示解析结果：
  - 识别到的文件
  - 总行数
  - 有效行数
  - 跳过行数
  - 重复行数
  - 警告信息

关键交互：

- 用户可以清空本地数据。
- 用户可以重新导入。
- 用户可以查看解析规则说明。

#### `/dashboard` 总览

信息架构：

- 顶部只突出一个 Hero Metric：`这些年你在 Apple 生态中的实际现金支出`。
- Hero Metric 下方展示 3 个核心分解指标：
  - 硬件支出
  - App / 内购 / 订阅支出
  - Store Credit 充值与消费
- 再往下展示年度趋势大图。
- 最后展示最近消费、最高消费 Top 10、数据质量提示。
- `账单项目价值`、`免费 / 限免项目数` 放在次级区域，不与实际现金支出等权。

顶部指标：

- Hero：实际现金支出。
- 次级：账单项目价值、硬件支出、软件 / 订阅支出、Store Credit 充值、Store Credit 消费、免费 / 限免项目数。

图表：

- 年度支出柱状图
- 类别占比环图
- 支付方式占比图
- 硬件 vs 软件趋势图

列表：

- 最高金额 Top 10
- 最近消费 Top 10
- 数据质量提示

视觉要求：

- 首屏不能像后台 KPI 看板，不能出现 6-8 个同尺寸指标卡。
- 实际现金支出使用超大字号和清晰说明，成为页面视觉中心。
- 年度趋势图占据较大横向空间，图表色彩克制。
- 数据质量提示用低干扰样式，不抢主指标注意力。
- 移动端按 Hero Metric、核心分解、趋势图、列表的顺序纵向排列。

#### `/ledger` 消费明细

表格字段：

- 日期
- 来源
- 类别
- 名称
- 所属 App / 服务
- 金额
- 支付方式
- 订单号
- 统计口径标签

功能：

- 多条件筛选。
- 关键词搜索。
- 金额排序。
- 导出当前筛选结果为 CSV。

视觉要求：

- 设计目标是“Apple 订单列表 + 银行流水”，不是企业后台表格。
- 行距稍大，主标题为商品 / 服务名称，副标题显示来源和所属 App / 服务。
- 金额右对齐，退款和 Store Credit 使用克制标签解释，不使用夸张颜色。
- 筛选区紧凑但不拥挤，优先使用 segmented control、select、date range、search。
- 原始 CSV 字段只在交易详情抽屉中展示，主表保持干净。
- 表格移动端可以切换为列表卡片，不强行横向挤压。

#### `/assets` 硬件资产

功能：

- 自动从 Apple Store 订单生成资产卡片。
- 按 iPhone、iPad、Mac、Watch、AirPods、配件分类。
- 显示购买日期、价格、订单号、使用时长。
- 支持手动设置状态：
  - 使用中
  - 已出售
  - 已闲置
  - 已送人
  - 未知

视觉要求：

- 设计目标是“Apple 产品陈列”，不是库存管理系统。
- 设备名称是卡片视觉中心，购买日期、价格、使用时长作为辅助信息。
- 可以使用 Apple 官网产品图或设备图；没有合适素材时再用抽象圆角矩形、线性图标、自定义设备轮廓或纯排版表达。
- 状态标签非常克制，不做高饱和状态色块。
- 分类导航按 iPhone / iPad / Mac / Watch / AirPods / Accessory 展示。
- 卡片密度比 Ledger 低，给设备资产留足空间。

### 6.3.1 V1 Apple-like 开发流程

V1 的前端开发顺序应该是：

1. 先做 Design System：
   - `tokens.css`
   - `tailwind.config.ts`
   - `AppleCard`
   - `AppleMetric`
   - `AppleButton`
   - `AppleSegmentedControl`
   - `ApplePageHeader`
2. 再做 Dashboard：
   - 用 mock data 验证信息层级和图表布局。
   - 确认首屏气质正确后再接真实统计数据。
3. 再做 Ledger：
   - 先完成明细列表和筛选体验。
   - 再补交易详情抽屉和 CSV 字段展示。
4. 再做 Assets：
   - 先从硬件订单生成资产卡片。
   - 再补设备状态和使用时长。
5. 每完成一个页面，执行一次视觉审查：
   - 信息层级是否清晰。
   - 是否有后台系统感。
   - 是否符合移动端。
   - 键盘焦点是否可见。
   - 颜色是否只作为辅助，不作为唯一信息载体。

### 6.3.2 推荐提示词模板

#### Design System 提示词

```text
使用 frontend-design skill，为 Apple 消费账本项目生成一套 Apple-like Design System。

技术栈：
- Vue 3
- TypeScript
- TailwindCSS
- Element Plus
- ECharts

项目定位：
这是一个统计 Apple 服务、App Store 消费、Store Credit、Apple Store 硬件资产的本地优先消费分析工具。

视觉要求：
- Apple 官网启发
- 高级极简
- 大留白、大数字、强层级
- 白色、近黑、浅灰、石墨灰为主
- 蓝色只用于链接、CTA、选中态
- 卡片圆角大但克制
- 阴影轻
- 表格密度适中
- 图表少装饰
- 动效轻量自然
- 可以使用 Apple 官网产品图作为个人本地素材
- 素材主要用于设备资产、年度报告和设备详情

请输出：
1. Tailwind theme extend 配置
2. CSS variables
3. 基础组件规范
4. Dashboard / Ledger / Assets 三类页面的视觉规则
5. 禁止事项清单
```

#### Dashboard 提示词

```text
使用 frontend-design skill，基于已有 Design System 实现 DashboardPage.vue。

要求：
- Vue 3 setup syntax
- TailwindCSS
- Element Plus 可以用于 Select / DatePicker / Drawer，但不要保留默认后台风格
- ECharts 图表要极简
- 首屏突出一个 Hero Metric：实际现金支出
- 其他指标分层展示，不要全部等权
- 图表颜色克制
- 移动端优先
- 使用 mock data
```

#### Ledger 提示词

```text
实现 LedgerPage.vue，视觉像 Apple 订单列表 + 银行流水，不要做成企业后台表格。

要求：
- 行距稍大
- 日期、来源、名称、金额层级清晰
- 金额右对齐
- 标签克制
- 筛选区紧凑但不拥挤
- 原始 CSV 字段放进详情抽屉
- 移动端切换为列表卡片
```

#### Assets 提示词

```text
实现 AssetsPage.vue，视觉像 Apple 产品陈列页，而不是库存管理系统。

要求：
- 按 iPhone / iPad / Mac / Watch / AirPods / Accessory 分类
- 设备卡片大留白
- 设备名称是视觉中心
- 购买日期、价格、使用时长作为辅助信息
- 优先使用 Apple 官网产品图或设备图
- 没有合适图片时再用抽象圆角矩形、线性图标或自定义设备轮廓作为占位视觉
- 状态标签要非常克制
```

### 6.4 V1 代码模块

建议目录：

```text
src/
  app/
    router.ts
    pinia.ts
  components/
    charts/
    import/
    ledger/
    summary/
    ui/
      AppleButton.vue
      AppleCard.vue
      AppleDataBadge.vue
      AppleMetric.vue
      ApplePageHeader.vue
      AppleReveal.vue
      AppleSectionTitle.vue
      AppleSegmentedControl.vue
  features/
    import/
      ImportPage.vue
      file-detector.ts
      import-store.ts
    transactions/
      transaction-model.ts
      transaction-store.ts
      transaction-selectors.ts
    apple-media/
      parse-store-transactions.ts
      classify-media-transaction.ts
    apple-store/
      parse-online-purchase-history.ts
      classify-hardware.ts
      dedupe-hardware-orders.ts
    dashboard/
      DashboardPage.vue
      summary-calculator.ts
    ledger/
      LedgerPage.vue
    assets/
      AssetsPage.vue
  lib/
    csv.ts
    money.ts
    date.ts
    id.ts
  styles/
    tokens.css
  storage/
    db.ts
```

### 6.5 V1 关键清洗规则

#### App Store 交易

- `Invoice Item Total = 0`：
  - `isFree = true`
  - `cashImpact = false`
  - 默认不计入实际支出
- `Payment Type = Store Credit`：
  - `cashImpact = false`
  - `billValueImpact = true`
  - 归入余额消费
- `Content Type = Gift Certificates` 且支付方式是 Alipay / Douyin Pay：
  - `cashImpact = true`
  - 归入 Store Credit 充值
- `Refund Amount > 0`：
  - 生成退款影响
  - 从净支出中扣除

#### Apple Store 硬件订单

- 空白汇总行：
  - 如果 `Description` 为空且 `Customer Order Number` 为空，跳过。
- 重复订单行：
  - 去重 key：`Customer Order Number + Line Item + Description + Price Including Tax`
- 金额：
  - `amount = Price Including Tax * Qty`
- 类别识别：
  - 包含 `IPHONE`：iPhone
  - 包含 `IPAD`：iPad
  - 包含 `MAC`、`MBA`、`MBP`、`MACBOOK`：Mac
  - 包含 `WATCH`：Apple Watch
  - 包含 `AIRPODS`：AirPods
  - 包含 `APPLECARE` 或 `AC+`：AppleCare
  - 其他进入 Accessory 或 Other

### 6.6 V1 验收标准

- 上传两个核心 CSV 后可以完成解析。
- Dashboard 能显示实际现金支出与账单项目价值，且 Store Credit 不重复计入现金支出。
- 硬件订单去重后再统计，不把汇总行算入明细。
- 消费明细可以按年份、类别、支付方式筛选。
- 所有金额使用 decimal.js 计算，避免浮点误差。
- 重新刷新页面后，数据仍保存在本地 IndexedDB。
- 已建立 Apple-like Design System，页面不直接暴露 Element Plus 默认后台风格。
- Dashboard 首屏有明确 Hero Metric，且指标不是全部等权。
- Ledger 主表保持干净，原始 CSV 字段只进入详情抽屉。
- Assets 页面像资产陈列，不像库存表。
- 颜色、标签和图表状态不只依赖颜色表达。
- 桌面和移动端都完成截图级人工检查。

### 6.7 V1 视觉 QA 清单

每个页面完成后按以下清单检查：

1. 第一屏是否一句话就能说清页面价值。
2. 标题和金额数字是否足够大，层级是否明显。
3. 颜色是否克制，蓝色是否只用于重点操作。
4. 每个区块是否只表达一个核心问题。
5. 留白是否足够，是否有后台系统感。
6. 动效是否自然，是否影响查账效率。
7. 键盘焦点是否清晰可见。
8. 表格 / 卡片在移动端是否可读。
9. 图表是否有文字标签或图例辅助。
10. Apple 产品图是否主要服务于设备识别和资产展示，而不是干扰核心数据阅读。

## 7. 第二版实现计划

### 7.1 V2 目标

把 V1 从“消费统计工具”升级为“Apple 生态资产与订阅管理工具”，增加更多数据源、更完整的设备生命周期、更强的分析与报告能力。

### 7.2 V2 范围

#### 数据源扩展

- 支持导入 Apple 数据导出 ZIP。
- 支持一次选择文件夹或多个文件。
- 解析更多文件：
  - `Subscription History.csv`
  - `Billing Payment and Commerce Projection.csv`
  - `Apple Pay Billings.csv`
  - `Store Credit Transaction History.csv`
  - `AppleCare Repairs and Service.csv`
  - `AppleCare Cases.csv`
  - `Apple ID Device Information.csv`
- 建立文件识别器，根据表头自动判断文件类型，而不是只靠文件名。

#### 订阅中心

功能：

- 展示所有订阅历史。
- 按服务统计累计支出。
- 展示订阅时间线：
  - 首次开通
  - 免费试用
  - 续订
  - 关闭自动续费
  - 到期
- 识别长期订阅：
  - iCloud
  - Apple Music
  - Bilibili
  - QQ 音乐
  - 微信读书
  - 其他 App 内订阅
- 计算订阅年化成本。

#### Store Credit 中心

功能：

- 充值总额。
- 已消费余额。
- 余额消费去向。
- 充值与消费时间线。
- 现金口径与账单项目口径对比。

#### 设备生命周期

功能：

- 将 Apple Store 硬件订单转为资产。
- 关联 AppleCare 与维修记录。
- 关联 Apple ID Device Information 中出现过的设备。
- 计算：
  - 持有天数
  - 月均成本
  - 日均成本
  - 是否购买 AppleCare
  - 是否有维修记录
- 支持手动维护：
  - 出售价格
  - 出售日期
  - 送人 / 闲置 / 报废状态
  - 当前主力设备标记

#### 年度报告

功能：

- 自动生成年度 Apple 消费报告。
- 内容包括：
  - 年度总支出
  - 年度硬件支出
  - 年度订阅支出
  - 年度最高消费
  - 年度新增设备
  - 年度最贵订阅
  - 与上一年对比
- 支持导出：
  - Markdown
  - PNG 长图
  - PDF

### 7.3 V2 页面结构

新增页面：

- `/subscriptions` 订阅中心
- `/store-credit` Store Credit 中心
- `/reports` 年度报告
- `/settings/rules` 分类与清洗规则
- `/data-quality` 数据质量与冲突处理

增强页面：

- Dashboard 增加年度对比、趋势洞察。
- Ledger 增加保存筛选视图。
- Assets 增加维修、AppleCare、出售记录。

### 7.4 V2 关键能力

#### 规则可配置

用户可以配置：

- 商品分类规则。
- 是否将某类订单计入现金支出。
- Store Credit 统计口径。
- 某些订单是否排除。
- 设备状态与备注。

#### 数据质量诊断

展示：

- 重复记录。
- 缺失日期。
- 缺失金额。
- 无法分类的商品。
- 同一订单在多个文件中出现的情况。
- 可能存在重复计入风险的记录。

#### 隐私与本地化

- 默认只在本地 IndexedDB 保存。
- 支持一键清空所有本地数据。
- 支持导出脱敏后的 JSON。
- 支持导出完整备份 JSON。

## 8. 开发里程碑

### Milestone 1：项目初始化

- 创建 Vue 3 + Vite + TypeScript 项目。
- 接入 TailwindCSS、Element Plus、Pinia、Vue Router。
- 建立基础布局与路由。
- 建立 IndexedDB 存储层。
- 使用 `frontend-design` 定义 Apple-like 视觉方向。
- 建立基础设计 tokens：颜色、字体、圆角、阴影、间距、动效时长。
- 建立 `src/components/ui` 基础组件，先不要进入业务页面堆样式。
- 对 Element Plus 做基础 CSS variables 覆盖，避免默认后台风格。

交付物：

- 可运行的前端项目。
- 空白的 Import、Dashboard、Ledger、Assets 页面。
- 第一版视觉规范文档或 `src/styles/tokens.css`。
- `AppleCard`、`AppleMetric`、`AppleButton`、`AppleSegmentedControl` 等基础组件。

### Milestone 2：CSV 导入与解析

- 封装 CSV 解析工具。
- 实现文件类型识别。
- 实现 App Store 交易解析器。
- 实现 Apple Store 硬件订单解析器。
- 保存导入批次与交易数据。

交付物：

- 上传 CSV 后能看到解析摘要。
- 控制台或页面能展示标准化后的交易数据。

### Milestone 3：统计计算

- 实现实际现金支出计算。
- 实现账单项目价值计算。
- 实现 Store Credit 充值 / 消费拆分。
- 实现硬件订单去重与分类汇总。
- 实现年度、类别、支付方式聚合。

交付物：

- Dashboard 指标计算正确。
- 能解释统计口径。

### Milestone 4：Dashboard 与图表

- 实现总览指标卡。
- 实现年度支出图。
- 实现类别占比图。
- 实现支付方式图。
- 实现 Top 消费列表。
- 按 Apple-like 风格完成 Dashboard 视觉打磨：
  - 一个 Hero Metric 主导首屏。
  - 大数字优先。
  - 少边框、多留白。
  - 图表颜色克制。
  - 动效自然且不干扰查账。
- 使用 `web-design-guidelines` 或人工清单完成视觉与可访问性审查。

交付物：

- 第一版消费总览可用。
- Dashboard 截图通过 Apple-like 视觉 QA。

### Milestone 5：消费明细与筛选

- 实现 Ledger 表格。
- 实现筛选、搜索、排序。
- 实现导出当前筛选结果。
- 增加交易详情抽屉，展示原始 CSV 字段。
- 移动端明细切换为列表卡片。
- 检查表格焦点态、金额右对齐、标签克制程度。

交付物：

- 可以像查账一样查看每一条消费。

### Milestone 6：硬件资产

- 从硬件订单生成资产。
- 实现资产列表与分类。
- 计算使用时长与月均成本。
- 支持手动更新资产状态。
- 使用 Apple-like 产品陈列风格展示设备卡片。
- 使用 Apple 官网产品图或设备图展示资产；缺图时再使用抽象设备轮廓或线性图标。

交付物：

- 可以看到自己的 Apple 设备资产清单。
- 可以维护本地 Apple 产品图片素材清单。

### Milestone 7：V2 扩展

- 支持 ZIP / 文件夹导入。
- 增加订阅中心。
- 增加 Store Credit 中心。
- 增加 AppleCare / 维修关联。
- 增加年度报告导出。

交付物：

- 从账单统计工具升级为完整 Apple 消费资产分析工具。

## 9. 第一版优先级

建议按下面顺序实现：

1. 数据模型与金额工具。
2. App Store CSV 解析。
3. Apple Store 硬件 CSV 解析与去重。
4. 统一交易表。
5. Apple-like Design System：tokens、Tailwind config、基础 UI 组件。
6. Dashboard mock 页面，先验证首屏气质和信息层级。
7. Dashboard 统计接入真实数据。
8. Ledger 明细表与详情抽屉。
9. Assets 资产页。
10. IndexedDB 持久化。
11. 导出 CSV。
12. 数据质量提示。
13. 视觉 QA 与可访问性检查。

## 10. 风险与注意事项

- Apple 导出的 CSV 字段可能随地区、语言、导出时间变化，需要基于表头识别，而不是完全依赖固定路径。
- 金额不能用 JavaScript number 直接累计，必须用 decimal.js。
- Store Credit 是最容易重复计算的地方，需要在 UI 中明确解释口径。
- Apple Store 硬件订单存在重复行和汇总行，必须先清洗再统计。
- App Store 的 `Invoice Item Total = 0` 不代表用户没有获取商品，只代表没有实际扣款。
- 部分 Apple Store 软件，如 Final Cut Pro、Logic Pro，可能出现在硬件订单文件里，需要归类为 Software 或 Pro Apps，而不是硬件。
- 隐私数据很多，默认不应上传到任何服务端。
- Apple 官网素材会提升设备识别度，但要避免图片喧宾夺主；Dashboard 仍然以数据为主，图片主要用于 Assets、设备详情和年度报告。
- 如果未来要公网发布或开源分发，Apple 图片素材需要重新评估授权或替换为自制素材。
- 如果直接使用 Element Plus 默认组件，会快速变成传统后台系统，需要在 V1 初期完成视觉覆盖。
- Tailwind class 如果无约束会膨胀，样式重复后应及时抽取 UI 组件和 tokens。
- 大字号和大留白会降低信息密度，需要通过 Dashboard / Ledger / Assets 三种页面分工解决，而不是在一个页面塞满所有数据。

## 11. 推荐的第一版完成形态

第一版完成后，用户打开应用应该能完成这个流程：

1. 拖入 Apple 数据导出的两个核心 CSV。
2. 页面提示识别到 App Store 消费记录和 Apple Store 硬件订单。
3. 应用自动清洗免费项目、Store Credit、重复硬件订单。
4. Dashboard 以一个 Hero Metric 显示实际现金支出，并分层展示：
   - 实际现金支出
   - 硬件支出
   - 软件 / 订阅支出
   - Store Credit 充值与消费
   - 年度支出趋势
5. 用户进入 Ledger 查看每一笔消费。
6. 用户进入 Assets 查看自己买过的 Apple 设备和配件。
7. 页面整体呈现 Apple 官网启发的数据看板气质，而不是 Element Plus 后台管理系统。

这个版本已经可以回答最核心的问题：

- 我到底给 Apple 生态花了多少钱？
- 这些钱分别花在哪里？
- 哪些钱是真实现金支出，哪些只是余额消费？
- 我的 Apple 设备资产历史是什么样的？
