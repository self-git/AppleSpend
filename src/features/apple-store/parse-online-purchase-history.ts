import type { AppleAsset, AppleTransaction, ImportWarning } from '@/features/transactions/transaction-model'
import type { CsvRow } from '@/lib/csv'
import { normalizeDate } from '@/lib/date'
import { createId } from '@/lib/id'
import { multiplyMoney } from '@/lib/money'
import { classifyHardware } from './classify-hardware'
import { hardwareDedupeKey, isBlankSummaryRow } from './dedupe-hardware-orders'

export interface HardwareParseResult {
  transactions: AppleTransaction[]
  assets: AppleAsset[]
  skippedCount: number
  duplicateCount: number
  warnings: ImportWarning[]
}

export function parseOnlinePurchaseHistory(rows: CsvRow[], filePath: string): HardwareParseResult {
  const seen = new Set<string>()
  const transactions: AppleTransaction[] = []
  const assets: AppleAsset[] = []
  const warnings: ImportWarning[] = []
  let skippedCount = 0
  let duplicateCount = 0

  rows.forEach((row, index) => {
    if (isBlankSummaryRow(row)) {
      skippedCount += 1
      return
    }

    const duplicateGroupKey = hardwareDedupeKey(row)
    if (seen.has(duplicateGroupKey)) {
      duplicateCount += 1
      return
    }
    seen.add(duplicateGroupKey)

    const title = String(row.Description ?? '').trim()
    if (!title) {
      skippedCount += 1
      warnings.push({ level: 'warning', message: '硬件订单缺少 Description，已跳过。', filePath, rowNumber: index + 2 })
      return
    }

    const amount = multiplyMoney(row['Price Including Tax'], row.Qty || 1).toFixed(2)
    const orderNumber = String(row['Customer Order Number'] ?? '').trim()
    const date = normalizeDate(row['Order Date'])
    const category = classifyHardware(title)
    const id = createId('store', [orderNumber, row['Line Item'], title, amount])

    const transaction: AppleTransaction = {
      id,
      source: 'apple_store',
      date,
      title,
      subtitle: row['Line Item'] ? `订单行 ${row['Line Item']}` : undefined,
      category,
      amount,
      currency: row.Currency || 'CNY',
      paymentMethod: row['Payment Method'] || 'Apple Store',
      orderNumber,
      rawType: 'Online Purchase History',
      cashImpact: true,
      billValueImpact: true,
      isFree: false,
      isRefund: Number(amount) < 0,
      duplicateGroupKey,
      raw: row,
    }

    transactions.push(transaction)
    assets.push({
      id: createId('asset', [id, title]),
      name: title,
      category,
      purchaseDate: date,
      purchasePrice: amount,
      currency: row.Currency || 'CNY',
      orderNumber,
      sourceTransactionId: id,
      status: 'unknown',
    })
  })

  if (duplicateCount > 0) {
    warnings.push({ level: 'info', message: `硬件订单已去重 ${duplicateCount} 行。`, filePath })
  }

  return { transactions, assets, skippedCount, duplicateCount, warnings }
}
