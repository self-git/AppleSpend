import type { AppleTransaction, ImportWarning } from '@/features/transactions/transaction-model'
import type { CsvRow } from '@/lib/csv'
import { normalizeDate } from '@/lib/date'
import { createId } from '@/lib/id'
import { parseMoney } from '@/lib/money'
import { isCashPayment, isStoreCredit, mediaCategory, normalizePaymentType } from './classify-media-transaction'

export interface MediaParseResult {
  transactions: AppleTransaction[]
  skippedCount: number
  warnings: ImportWarning[]
}

export function parseStoreTransactions(rows: CsvRow[], filePath: string): MediaParseResult {
  const transactions: AppleTransaction[] = []
  const warnings: ImportWarning[] = []
  let skippedCount = 0

  rows.forEach((row, index) => {
    const contentType = String(row['Content Type'] ?? '').trim()
    const containerDescription = String(row['Container Description'] ?? '').trim()
    const title = resolveMediaTitle(row, contentType, containerDescription)
    const date = normalizeDate(row['Item Purchased Date'])
    if (!title || !date) {
      skippedCount += 1
      warnings.push({ level: 'warning', message: 'App Store 记录缺少日期或名称，已跳过。', filePath, rowNumber: index + 2 })
      return
    }

    const paymentMethod = normalizePaymentType(row['Payment Type'])
    const invoiceTotal = parseMoney(row['Invoice Item Total'])
    const refund = parseMoney(row['Refund Amount'])
    const netAmount = invoiceTotal.minus(refund)
    const isFree = invoiceTotal.isZero()
    const category = mediaCategory(contentType, title)
    const storeCredit = isStoreCredit(paymentMethod)
    const transaction: AppleTransaction = {
      id: createId('media', [row['Order Number'], date, title, row['Invoice Item Total'], row['Refund Amount']]),
      source: category === 'Subscription' ? 'subscription' : category === 'Store Credit' ? 'store_credit' : 'app_store',
      date,
      title,
      subtitle: containerDescription || undefined,
      category,
      amount: netAmount.toFixed(2),
      currency: row.Currency || 'CNY',
      paymentMethod,
      orderNumber: row['Order Number'] || undefined,
      rawType: contentType,
      cashImpact: !isFree && isCashPayment(paymentMethod),
      billValueImpact: !isFree,
      isFree,
      isRefund: refund.gt(0) || netAmount.lt(0),
      raw: row,
    }

    if (!isFree && storeCredit) transaction.cashImpact = false
    transactions.push(transaction)
  })

  return { transactions, skippedCount, warnings }
}

function resolveMediaTitle(row: CsvRow, contentType: string, containerDescription: string): string {
  const itemDescription = String(row['Item Description'] ?? '').trim()
  if (itemDescription) return itemDescription
  if (containerDescription) return containerDescription
  if (contentType === 'Gift Certificates') return 'Apple 账户余额充值'
  if (contentType) return contentType
  return ''
}
