import { classifyHardware } from '@/features/apple-store/classify-hardware'
import type { AppleRetailPlatform } from '@/features/transactions/transaction-model'
import { createId } from '@/lib/id'
import { parseMoney } from '@/lib/money'
import { createDeviceFingerprints } from './device-fingerprint'
import type { ExternalRetailImportDraft } from './external-retail-model'
import { extractSensitiveIdentifiers, redactSensitiveText } from './redact-sensitive-text'

export async function parseExternalRetailInvoiceText(text: string, sourceFileName: string): Promise<ExternalRetailImportDraft | undefined> {
  if (!isInvoiceText(text)) return undefined

  const invoiceNumber = extractFirst(text, /发票号码\s*[:：]\s*([0-9]+)/)
  const invoiceCode = extractFirst(text, /发票代码\s*[:：]\s*([0-9]+)/)
  const invoiceDate = extractInvoiceDate(text)
  const sellerName = extractSellerName(text)
  const productName = extractProductName(text, sourceFileName)
  const modelCode = extractModelCode(text)
  const orderNumber = extractFirst(text, /订单号\s*[:：]\s*([A-Za-z0-9-]+)/)
  const totalAmount = extractAmount(text, /小写\)\s*[¥￥]?\s*([-\d,.]+)/)
  const userPaidAmount = extractAmount(text, /用户实付金额\s*([-\d,.]+)/)
  const orderAmount = extractAmount(text, /订单金额\s*([-\d,.]+)/)
  const subsidyAmount = extractAmount(text, /(?:政府补贴金额|补贴金额)\s*([-\d,.]+)/)
  const cashAmount = userPaidAmount || totalAmount || orderAmount
  const billValueAmount = orderAmount || totalAmount || cashAmount
  const quantity = extractQuantity(text)
  const identifiers = extractSensitiveIdentifiers(text)
  const fingerprints = await createDeviceFingerprints(identifiers.sn, identifiers.imeis)
  const platform = inferRetailPlatform(sourceFileName, sellerName, text)
  const warnings = buildWarnings({
    invoiceNumber,
    invoiceDate,
    productName,
    cashAmount,
    sellerName,
    deviceFingerprint: fingerprints.deviceFingerprint,
  })
  const category = classifyHardware(`${productName} ${modelCode ?? ''}`)

  return {
    id: createId('external-draft', [invoiceNumber, orderNumber, productName, cashAmount, sourceFileName]),
    sourceFileName,
    platform,
    sellerName,
    invoiceCode,
    invoiceNumber,
    invoiceDate,
    orderNumber,
    productName,
    modelCode,
    quantity,
    cashAmount,
    billValueAmount,
    subsidyAmount,
    currency: 'CNY',
    category,
    ...fingerprints,
    imeiFingerprints: fingerprints.imeiFingerprints,
    fingerprintSources: fingerprints.fingerprintSources,
    redactedText: redactSensitiveText(text),
    confidence: warnings.length ? 'medium' : 'high',
    warnings,
  }
}

function isInvoiceText(text: string): boolean {
  return /电子发票|增值税电子普通发票/.test(text) && /价税合计/.test(text) && /(项目名称|货物或应税劳务、服务名称)/.test(text)
}

function extractFirst(text: string, pattern: RegExp): string | undefined {
  return text.match(pattern)?.[1]?.trim()
}

function extractAmount(text: string, pattern: RegExp): string | undefined {
  const value = extractFirst(text, pattern)
  if (!value) return undefined
  return parseMoney(value).abs().toFixed(2)
}

function extractInvoiceDate(text: string): string | undefined {
  const match = text.match(/开票日期\s*[:：]\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
  if (!match) return undefined
  const [, year, month, day] = match
  if (!year || !month || !day) return undefined
  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-')
}

function extractSellerName(text: string): string | undefined {
  const explicitSeller = text.match(/售\s*名\s*称\s*[:：]\s*([^\n]+)/)?.[1]
  if (explicitSeller) return cleanInlineValue(explicitSeller)

  const names = Array.from(text.matchAll(/名\s*称\s*[:：]\s*([^\n]+)/g))
    .map((match) => match[1])
    .filter((value): value is string => Boolean(value))
    .map((value) => cleanInlineValue(value))
  return [...names].reverse().find((name) => /公司|旗舰店|专卖店/.test(name)) || names[names.length - 1]
}

function extractProductName(text: string, sourceFileName: string): string {
  const iphoneMatches = Array.from(text.matchAll(/iPhone\s*(\d{1,2})\s*(Pro\s*Max|Pro|Plus|Mini)?(?:\s*(\d{2,4})\s*(GB|G|TB))?(?:\s*([\u4e00-\u9fa5]{1,3}色))?/gi))
  const preferred = iphoneMatches.find((match) => match[3]) || iphoneMatches[0]
  if (preferred) {
    const [, generation, variant, capacity, unit, color] = preferred
    return [
      'iPhone',
      generation,
      normalizeVariant(variant),
      capacity ? `${capacity}${String(unit).toUpperCase() === 'G' ? 'GB' : String(unit).toUpperCase()}` : undefined,
      color,
    ]
      .filter(Boolean)
      .join(' ')
  }

  const itemLine = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.includes('*') && /Apple|IPHONE|IPAD|MAC|WATCH|AIRPODS/i.test(line))
  if (itemLine) return itemLine.replace(/\*[^*]+\*/g, '').trim()

  return sourceFileName.replace(/\.[^.]+$/, '')
}

function normalizeVariant(value: string | undefined): string | undefined {
  if (!value) return undefined
  return value
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function extractModelCode(text: string): string | undefined {
  const match = text.match(/\b([A-Z0-9]{5}CH)\s*\/?\s*A\b/i)
  return match?.[1] ? `${match[1].toUpperCase()}/A` : undefined
}

function extractQuantity(text: string): number | undefined {
  const match = text.match(/(?:个|台)\s+(\d+(?:\.\d+)?)/)
  if (!match) return undefined
  const quantity = Number(match[1])
  return Number.isFinite(quantity) ? quantity : undefined
}

function inferRetailPlatform(sourceFileName: string, sellerName: string | undefined, text: string): AppleRetailPlatform {
  const value = `${sourceFileName} ${sellerName ?? ''} ${text}`.toLowerCase()
  if (value.includes('京东') || value.includes('jd.com')) return 'jd'
  if (value.includes('天猫') || value.includes('tmall')) return 'tmall'
  if (value.includes('淘宝') || value.includes('taobao')) return 'taobao'
  if (value.includes('苹果电子产品商贸') || value.includes('apple store')) return 'apple_store'
  return 'other'
}

function cleanInlineValue(value: string): string {
  return value
    .replace(/\s{2,}.+$/, '')
    .replace(/\s*(统一社会信用代码|纳税人识别号|销|售|方|信|息).*$/, '')
    .trim()
}

function buildWarnings(input: {
  invoiceNumber?: string
  invoiceDate?: string
  productName?: string
  cashAmount?: string
  sellerName?: string
  deviceFingerprint?: string
}): string[] {
  return [
    !input.invoiceNumber ? '未识别到发票号码。' : '',
    !input.invoiceDate ? '未识别到开票日期。' : '',
    !input.productName ? '未识别到商品名称。' : '',
    !input.cashAmount ? '未识别到现金支出金额。' : '',
    !input.sellerName ? '未识别到销售方。' : '',
    !input.deviceFingerprint ? '未识别到 SN / IMEI，只能按订单维度去重。' : '',
  ].filter(Boolean)
}
