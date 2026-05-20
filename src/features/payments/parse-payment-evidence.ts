import type { CsvRow } from '@/lib/csv'
import { normalizeDate } from '@/lib/date'
import { createId } from '@/lib/id'
import { compactTextParts, findRowValue } from '@/lib/row'
import type { ImportWarning, PaymentEvidence } from '@/features/transactions/transaction-model'

export interface PaymentEvidenceParseResult {
  evidence: PaymentEvidence[]
  skippedCount: number
  warnings: ImportWarning[]
}

export function parsePaymentEvidence(
  rows: CsvRow[],
  filePath: string,
  sourceType: 'billing_projection' | 'apple_pay_billings',
): PaymentEvidenceParseResult {
  const evidence: PaymentEvidence[] = []
  const warnings: ImportWarning[] = []
  let skippedCount = 0

  rows.forEach((row, index) => {
    const date = normalizeDate(
      findRowValue(row, ['Billing Date', 'Next Billing Date', 'Projected Billing Date', 'Transaction Date', 'Date']),
    )
    const amount = findRowValue(row, ['Amount', 'Projected Amount', 'Transaction Amount'])
    const descriptor = compactTextParts([
      findRowValue(row, ['Merchant', 'Description', 'Payee']),
      findRowValue(row, ['Subscription Name', 'Service Name']),
    ])

    if (!date || !amount) {
      skippedCount += 1
      warnings.push({ level: 'warning', message: '账单 / Apple Pay 记录缺少日期或金额，已跳过。', filePath, rowNumber: index + 2 })
      return
    }

    evidence.push({
      id: createId('payment', [sourceType, date, amount, descriptor, index]),
      date,
      amount,
      currency: findRowValue(row, ['Currency']) || 'CNY',
      paymentMethod:
        compactTextParts([findRowValue(row, ['Payment Method']), findRowValue(row, ['Card', 'Card Description'])]) || undefined,
      orderNumber: findRowValue(row, ['Order Number', 'Reference Number']) || undefined,
      relatedTransactionIds: [],
      raw: row,
    })
  })

  return { evidence, skippedCount, warnings }
}
