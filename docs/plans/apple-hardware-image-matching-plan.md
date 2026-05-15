# Apple 硬件订单图片匹配方案

## 背景

当前交易详情抽屉中，硬件订单使用按品类匹配的官方 Apple 图片。例如只要识别到 `iPhone`，就展示一张默认 iPhone 图片。这会导致历史订单与展示图片完全不对应，例如 `IPHONE 11 WHITE 256GB-CHN` 被展示成新款 iPhone Pro 图片。

目标不是“尽可能显示一张漂亮图片”，而是“只有在能较可靠对应到具体产品时才显示商品图”。匹配不到时，应回退到中性设备图标，避免误导。

## 目标

- 对 Apple Store 硬件订单提供更准确的产品图匹配。
- 优先匹配订单中的具体型号、颜色、容量、地区或配置。
- 匹配置信度不足时，不展示错误的官方商品图。
- 方案可维护，后续可以逐步补充更多订单样本。
- 不依赖不稳定的运行时抓取，保证前端本地可用。

## 非目标

- 不做实时 Apple Store 抓取。
- 不承诺覆盖所有 Apple 历史 SKU。
- 不在本阶段引入付费 API。
- 不把第三方零售商图片作为默认主数据源。
- 不在用户确认前改动现有实现代码。

## 调研结论

### Apple 官方图片源

Apple 的 `store.storeimages.cdn-apple.com` 和 `as-images.apple.com/is/...` 图片可以直接展示，且很多历史产品图片仍然可访问。例如 iPhone 11 白色图片可通过 `iphone11-white-select-2019` 这类资源名访问。

但图片资源名不能简单由 MPN 或订单号拼出来。测试类似 `MWM82CH_A` 的 CDN 路径返回 `404`，说明“订单标题或 MPN -> 图片 URL”需要额外映射。

### Apple 订单标题

当前 CSV 中的 Apple Store 硬件订单标题包含可解析信息，例如：

```text
IPHONE 11 WHITE 256GB-CHN
MBA 13.3 SPG/8C CPU/7C GPU
```

这些字段通常可以解析出产品线、型号、颜色、容量、地区或配置，但表达方式不统一，需要维护别名和缩写。

### 型号数据库

EveryMac / Everyi 对 Apple order number、地区、颜色、容量覆盖较好，适合做人工补全和校验来源。Reincubate DeviceIdentifier 说明 Apple MPN 可表示颜色、容量、销售地区等信息，但直接使用其 API 会引入第三方依赖和可能的付费/限额问题。

### 第三方 UPC/商品库

Go-UPC、UPCitemdb 等可以按 UPC/EAN 查询商品图片和 MPN，但当前订单数据未必包含 UPC/EAN，且图片可能来自零售商或二手商品源，不适合作为默认展示源。

### 合规注意

Apple Affiliate 图片指南要求通过授权渠道使用 Apple 产品图片，并保持图片与相关产品对应。当前项目如果只是个人账本工具，技术上可直接引用公开 CDN 图片；如果后续要公开发布或商业化，需要重新评估图片授权。

## 方案对比

| 方案 | 准确性 | 稳定性 | 实现成本 | 适用性 |
| --- | --- | --- | --- | --- |
| 按品类默认图 | 低 | 高 | 低 | 已证明不适合 |
| 本地精确映射表 | 高 | 高 | 中 | 推荐 |
| 标题解析 + 置信度回退 | 中高 | 高 | 中 | 推荐，与映射表配合 |
| Apple Store 运行时抓取 | 中高 | 低 | 高 | 不推荐作为前端默认 |
| 第三方商品 API | 中 | 中 | 中高 | 可作为后续辅助 |
| 用户手动上传/指定图片 | 最高 | 高 | 中 | 可作为增强功能 |

## 推荐方案

采用“标题解析 + 本地精确映射表 + 置信度回退”的混合方案。

匹配流程：

1. 仅对 `source === 'apple_store'` 的硬件订单启用硬件图片匹配。
2. 将订单名称和原始 CSV 字段标准化为统一文本。
3. 解析产品线、型号、颜色、容量、地区、配置缩写。
4. 用解析结果查本地 catalog。
5. 如果命中高置信度规则，展示对应官方图片。
6. 如果只命中品类或置信度不足，回退到现有中性图标。

核心原则：宁可不展示商品图，也不要展示错误商品图。

## 数据结构草案

建议新增一个独立文件，例如：

```text
src/features/media-assets/apple-hardware-catalog.ts
```

示例结构：

```ts
type AppleHardwareCatalogItem = {
  id: string
  productLine: 'iPhone' | 'Mac' | 'iPad' | 'Apple Watch' | 'AirPods' | 'Accessory' | 'AppleCare'
  model: string
  aliases: string[]
  color?: string
  colorAliases?: string[]
  capacity?: string
  region?: string
  configKeywords?: string[]
  image: {
    src: string
    alt: string
    source: 'apple-official'
  }
}
```

示例条目：

```ts
{
  id: 'iphone-11-white',
  productLine: 'iPhone',
  model: 'iPhone 11',
  aliases: ['IPHONE 11'],
  color: 'White',
  colorAliases: ['WHITE', '白色'],
  capacity: '256GB',
  region: 'CHN',
  image: {
    src: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone11-white-select-2019?wid=940&hei=1112&fmt=png-alpha&qlt=80&.v=1566956148115',
    alt: 'iPhone 11 White',
    source: 'apple-official',
  },
}
```

容量是否纳入强匹配需要按产品判断。iPhone 11 的 64GB/128GB/256GB 外观相同，因此图片匹配可以不强依赖容量；但容量仍应参与置信度计算，避免标题解析偏移。

## Parser 规则草案

### 产品线识别

- `IPHONE` -> `iPhone`
- `IPAD` -> `iPad`
- `MBA`, `MACBOOK AIR` -> `Mac`
- `MBP`, `MACBOOK PRO` -> `Mac`
- `WATCH` -> `Apple Watch`
- `AIRPODS` -> `AirPods`

### 颜色识别

- `WHITE` -> `White`
- `BLACK` -> `Black`
- `GREEN` -> `Green`
- `PURPLE` -> `Purple`
- `YELLOW` -> `Yellow`
- `RED`, `PRODUCTRED` -> `PRODUCT(RED)`
- `SPG`, `SPACE GRAY`, `SPACE GREY` -> `Space Gray`
- `SLV`, `SILVER` -> `Silver`
- `GLD`, `GOLD` -> `Gold`
- `MIDNIGHT`, `STARLIGHT` 等按后续样本补充

### 地区识别

- `CHN`, `CH/A` -> `China mainland`
- `ZP/A` -> `Hong Kong`
- `LL/A` -> `United States`
- 其他地区作为可选字段，不作为第一阶段强依赖。

### 置信度

建议用明确等级，而不是模糊布尔值：

- `exact`: 产品线、型号、颜色都命中，图片可展示。
- `strong`: 产品线、型号命中，颜色未出现但 catalog 只有一个合理候选，可展示。
- `weak`: 只命中产品线或泛型号，不展示商品图。
- `none`: 未识别，回退。

交易详情中只展示 `exact` 和经过明确允许的 `strong`。

## 第一阶段覆盖范围

先覆盖当前账本中已经出现的硬件订单，而不是一次性整理所有 Apple 历史产品。

建议第一阶段：

- 从现有导入数据中抽取所有 `Apple Store` 硬件订单标题。
- 统计去重后的订单名称。
- 优先覆盖金额较大、出现频率高、明显可解析的订单。
- 为每个新增 catalog 条目记录来源 URL 或校验备注。

已知需要覆盖：

- `IPHONE 11 WHITE 256GB-CHN`
- `MBA 13.3 SPG/8C CPU/7C GPU`

## 实施步骤

### 步骤 1：撤销粗粒度官方图默认匹配

移除当前 `Mac`、`iPhone`、`iPad` 等品类默认官方图匹配，避免继续出现错图。

保留现有本地中性图标作为兜底。

### 步骤 2：新增硬件订单解析器

新增纯函数：

```ts
parseAppleHardwareTitle(input: string): ParsedAppleHardware
```

输出产品线、型号、颜色、容量、地区、原始 tokens。

### 步骤 3：新增本地 catalog

新增 `apple-hardware-catalog.ts`，先放少量高质量条目。

每条记录要求：

- 有明确匹配关键词。
- 图片确认为对应型号和颜色。
- 图片源 URL 可访问。
- `alt` 文案准确。

### 步骤 4：新增 resolver

新增或调整：

```ts
resolveAppleHardwareImage(transaction): AppleVisualAsset | null
```

返回值必须带置信度判断。低置信度返回 `null`，由上层回退。

### 步骤 5：接入交易详情抽屉

交易详情 hero 使用新的 resolver：

1. 高置信度硬件图。
2. 原有交易图片 resolver。
3. 中性图标。

列表视图暂时不改，避免小图处出现过多视觉噪声。

### 步骤 6：增加测试样例

添加单元测试或最小可运行测试用例，覆盖：

- `IPHONE 11 WHITE 256GB-CHN` 命中 iPhone 11 white。
- `MBA 13.3 SPG/8C CPU/7C GPU` 命中 MacBook Air Space Gray 或指定 MacBook Air 图。
- 未知 `IPHONE 99 BLUE 1TB` 不应命中任何官方图。
- 只有 `IPHONE` 的泛标题不应展示官方图。

### 步骤 7：视觉验证

在本地页面打开交易详情，确认：

- iPhone 11 白色订单不再显示新款 iPhone Pro。
- 匹配不到的硬件订单显示中性图标。
- 图片在桌面和较窄视口下不拉伸、不裁切关键信息。

## 验收标准

- `IPHONE 11 WHITE 256GB-CHN` 显示 iPhone 11 白色官方图。
- 不再出现“只因类别相同而显示错误新款产品图”的情况。
- 未知硬件订单不会展示错误商品图。
- `pnpm build` 通过。
- 新增匹配逻辑有测试或明确样例验证。
- 图片匹配数据集中、可维护，不散落在 Vue 组件中。

## 风险与处理

### Apple 图片 URL 失效

处理方式：catalog 条目集中维护，后续可增加图片健康检查脚本。第一阶段先不做自动检查。

### 历史产品官方图难找

处理方式：匹配不到就回退，不用近似图硬凑。

### 订单标题格式不统一

处理方式：parser 保留原始 tokens，并逐步补充别名。不要用过于宽泛的正则。

### 图片授权

处理方式：项目公开或商业化前重新评估 Apple 图片使用授权；必要时改为用户自有图片、设备轮廓图或授权素材。

## 待确认问题

1. 第一阶段是否只覆盖账本中已出现的硬件订单？
2. 交易列表的小图是否也要改成精确商品图，还是只改交易详情抽屉？
3. 对匹配不到的硬件订单，是显示中性设备图标，还是显示“暂无准确图片”的空状态？
4. 是否接受为每个 catalog 条目附带来源备注，方便后续维护但会让数据文件稍长？

## 建议决策

建议确认后按推荐方案实施：

- 只在交易详情抽屉展示高置信度官方图。
- 第一阶段只覆盖当前账本中出现过的订单。
- 匹配不到时回退到中性图标。
- catalog 条目保留来源备注，方便后续扩展和排查。
