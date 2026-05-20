import type { CsvRow } from '@/lib/csv'
import { normalizeDate } from '@/lib/date'
import { createId } from '@/lib/id'
import { findRowValue } from '@/lib/row'
import type { ImportWarning, StoreCreditEntry } from '@/features/transactions/transaction-model'

export interface StoreCreditHistoryParseResult {
  entries: StoreCreditEntry[]
  skippedCount: number
  warnings: ImportWarning[]
}

export function parseStoreCreditHistory(rows: CsvRow[], filePath: string): StoreCreditHistoryParseResult {
  const entries: StoreCreditEntry[] = []
  const warnings: ImportWarning[] = []
  let skippedCount = 0

  rows.forEach((row, index) => {
    const date = normalizeDate(findRowValue(row, ['Transaction Date', 'Date', 'Posted Date']))
    const typeText = findRowValue(row, ['Transaction Type', 'Type', 'Action', 'Description'])
    const amount = findRowValue(row, ['Amount', 'Transaction Amount', 'Credit Amount', 'Debit Amount'])

    if (!date || !amount) {
      skippedCount += 1
      warnings.push({ level: 'warning', message: 'Apple 账户余额流水缺少日期或金额，已跳过。', filePath, rowNumber: index + 2 })
      return
    }

    const id = createId('credit', [
      date,
      typeText,
      amount,
      findRowValue(row, ['Order Number', 'Reference Number']),
      findRowValue(row, ['Description']),
    ])
    entries.push({
      id,
      date,
      direction: normalizeDirection(typeText, amount),
      amount,
      currency: findRowValue(row, ['Currency']) || 'CNY',
      source: 'store_credit_history',
      orderNumber: findRowValue(row, ['Order Number', 'Reference Number']) || undefined,
      balanceAfter: findRowValue(row, ['Balance', 'Balance After', 'Remaining Balance']) || undefined,
      raw: row,
    })
  })

  return { entries, skippedCount, warnings }
}

function normalizeDirection(typeText: string, amount: string): StoreCreditEntry['direction'] {
  const upper = typeText.trim().toUpperCase()
  if (upper.includes('RECHARGE') || upper.includes('TOP UP') || upper.includes('ADD') || upper.includes('LOAD')) return 'recharge'
  if (upper.includes('REFUND') || upper.includes('RETURN')) return 'refund'
  if (upper.includes('ADJUST')) return 'adjustment'
  if (upper.includes('SPEND') || upper.includes('PURCHASE') || upper.includes('USE') || upper.includes('PAYMENT')) return 'spend'
  return String(amount).trim().startsWith('-') ? 'spend' : 'unknown'
}
