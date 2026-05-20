export type AppleCsvFileType =
  | 'media_transactions'
  | 'online_purchase_history'
  | 'subscription_history'
  | 'billing_projection'
  | 'apple_pay_billings'
  | 'store_credit_history'
  | 'applecare_repairs'
  | 'applecare_cases'
  | 'apple_id_device_information'
  | 'unknown'

export interface AppleFileSignature {
  type: AppleCsvFileType
  label: string
  requiredGroups: string[][]
  optionalFields?: string[]
  pathHints?: string[]
}

export interface FileDetectionResult {
  type: AppleCsvFileType
  label: string
  ambiguous: boolean
  candidates: AppleCsvFileType[]
  score: number
}

export const appleFileSignatures: AppleFileSignature[] = [
  {
    type: 'media_transactions',
    label: 'App Store / 媒体服务账单',
    requiredGroups: [
      ['Item Purchased Date'],
      ['Invoice Item Total'],
      ['Payment Type'],
    ],
    optionalFields: ['Content Type', 'Item Description', 'Order Number', 'Refund Amount'],
    pathHints: ['store transaction purchase', 'purchase history'],
  },
  {
    type: 'online_purchase_history',
    label: 'Apple Store 硬件订单',
    requiredGroups: [
      ['Customer Order Number'],
      ['Price Including Tax'],
      ['Description'],
    ],
    optionalFields: ['Order Date', 'Line Item', 'Qty', 'Payment Method'],
    pathHints: ['online purchase history'],
  },
  {
    type: 'subscription_history',
    label: '订阅历史',
    requiredGroups: [
      ['Subscription Name', 'Service Name', 'App Name'],
      ['Event Date', 'Date', 'Transaction Date'],
      ['Event Type', 'Status', 'Action'],
    ],
    optionalFields: ['Billing Period', 'Amount', 'Currency', 'Product Name', 'Order Number'],
    pathHints: ['subscription history', 'subscriptions'],
  },
  {
    type: 'billing_projection',
    label: '账单预测 / 未来扣费',
    requiredGroups: [
      ['Billing Date', 'Next Billing Date', 'Projected Billing Date'],
      ['Amount', 'Projected Amount'],
    ],
    optionalFields: ['Subscription Name', 'Service Name', 'Currency', 'Billing Period'],
    pathHints: ['billing projection', 'upcoming bill', 'projected'],
  },
  {
    type: 'apple_pay_billings',
    label: 'Apple Pay / 钱包账单',
    requiredGroups: [
      ['Transaction Date', 'Date'],
      ['Amount'],
      ['Merchant', 'Description', 'Payee'],
    ],
    optionalFields: ['Currency', 'Payment Method', 'Card', 'Order Number'],
    pathHints: ['apple pay', 'wallet', 'billings'],
  },
  {
    type: 'store_credit_history',
    label: 'Apple 账户余额流水',
    requiredGroups: [
      ['Transaction Date', 'Date'],
      ['Transaction Type', 'Type'],
      ['Amount', 'Transaction Amount'],
    ],
    optionalFields: ['Balance', 'Balance After', 'Order Number', 'Description', 'Currency'],
    pathHints: ['store credit', 'gift card', 'balance history'],
  },
  {
    type: 'applecare_repairs',
    label: 'AppleCare 维修记录',
    requiredGroups: [
      ['Repair Date', 'Service Date', 'Date'],
      ['Device Name', 'Product Name', 'Device'],
      ['Repair Status', 'Status'],
    ],
    optionalFields: ['Issue', 'Cost', 'Currency', 'Serial Number', 'Repair ID'],
    pathHints: ['repair', 'service history', 'applecare repairs'],
  },
  {
    type: 'applecare_cases',
    label: 'Apple 支持 / 案例记录',
    requiredGroups: [
      ['Case Number', 'Support Case Number', 'Case ID'],
      ['Opened Date', 'Created Date', 'Date'],
      ['Device Name', 'Product Name', 'Device'],
    ],
    optionalFields: ['Closed Date', 'Status', 'Issue', 'Serial Number'],
    pathHints: ['support case', 'applecare cases', 'case history'],
  },
  {
    type: 'apple_id_device_information',
    label: 'Apple ID 设备信息',
    requiredGroups: [
      ['Device Name', 'Name'],
      ['Model Identifier', 'Model'],
      ['Last Seen Date', 'Last Active Date', 'Last Seen'],
    ],
    optionalFields: ['Serial Number', 'Platform', 'OS Version', 'First Seen Date'],
    pathHints: ['device information', 'devices', 'apple id device'],
  },
]

const labelByType = new Map(appleFileSignatures.map((item) => [item.type, item.label]))

export function fileTypeLabel(type: AppleCsvFileType): string {
  return labelByType.get(type) ?? '未识别文件'
}

export function normalizeFieldName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function includesHint(name: string, pathHints: string[] = []): boolean {
  const lowerName = name.toLowerCase()
  return pathHints.some((hint) => lowerName.includes(hint))
}

function countOptionalMatches(normalizedFields: Set<string>, optionalFields: string[] = []): number {
  return optionalFields.filter((field) => normalizedFields.has(normalizeFieldName(field))).length
}

function requiredMatchCount(normalizedFields: Set<string>, signature: AppleFileSignature): number {
  return signature.requiredGroups.filter((group) => group.some((field) => normalizedFields.has(normalizeFieldName(field)))).length
}

export function detectAppleCsvFile(name: string, fields: string[]): FileDetectionResult {
  const normalizedFields = new Set(fields.map((field) => normalizeFieldName(field)))

  const scored = appleFileSignatures
    .map((signature) => {
      const requiredCount = requiredMatchCount(normalizedFields, signature)
      const requiredRatio = signature.requiredGroups.length ? requiredCount / signature.requiredGroups.length : 0
      const optionalScore = countOptionalMatches(normalizedFields, signature.optionalFields)
      const hintScore = includesHint(name, signature.pathHints) ? 0.4 : 0
      const score = requiredRatio * 3 + optionalScore * 0.1 + hintScore
      return {
        signature,
        requiredCount,
        requiredRatio,
        score,
      }
    })
    .filter((item) => item.requiredCount > 0 || includesHint(name, item.signature.pathHints))
    .sort((a, b) => b.score - a.score)

  if (!scored.length) {
    return {
      type: 'unknown',
      label: fileTypeLabel('unknown'),
      ambiguous: false,
      candidates: [],
      score: 0,
    }
  }

  const best = scored[0]
  if (!best) {
    return {
      type: 'unknown',
      label: fileTypeLabel('unknown'),
      ambiguous: false,
      candidates: [],
      score: 0,
    }
  }
  const candidates = scored
    .filter((item) => Math.abs(item.score - best.score) < 0.45)
    .map((item) => item.signature.type)

  const confident = best.requiredRatio >= 1 || (best.requiredRatio >= 0.67 && includesHint(name, best.signature.pathHints))
  if (!confident) {
    return {
      type: 'unknown',
      label: fileTypeLabel('unknown'),
      ambiguous: false,
      candidates,
      score: best.score,
    }
  }

  return {
    type: best.signature.type,
    label: best.signature.label,
    ambiguous: candidates.length > 1,
    candidates,
    score: best.score,
  }
}
