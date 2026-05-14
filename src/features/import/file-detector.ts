export type AppleCsvFileType = 'media_transactions' | 'online_purchase_history' | 'unknown'

export function detectAppleCsvFile(name: string, fields: string[]): AppleCsvFileType {
  const lowerName = name.toLowerCase()
  const fieldSet = new Set(fields.map((field) => field.trim()))

  if (
    lowerName.includes('store transaction purchase') ||
    (fieldSet.has('Item Purchased Date') && fieldSet.has('Invoice Item Total') && fieldSet.has('Payment Type'))
  ) {
    return 'media_transactions'
  }

  if (
    lowerName.includes('online purchase history') ||
    (fieldSet.has('Customer Order Number') && fieldSet.has('Price Including Tax') && fieldSet.has('Description'))
  ) {
    return 'online_purchase_history'
  }

  return 'unknown'
}

export function fileTypeLabel(type: AppleCsvFileType): string {
  if (type === 'media_transactions') return 'App Store / 媒体服务账单'
  if (type === 'online_purchase_history') return 'Apple Store 硬件订单'
  return '未识别文件'
}
