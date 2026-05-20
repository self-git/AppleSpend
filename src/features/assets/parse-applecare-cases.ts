import type { CsvRow } from '@/lib/csv'
import { normalizeDate } from '@/lib/date'
import { createId } from '@/lib/id'
import { compactTextParts, findRowValue } from '@/lib/row'
import type { AppleSupportCase, ImportWarning } from '@/features/transactions/transaction-model'

export interface SupportCaseParseResult {
  supportCases: AppleSupportCase[]
  skippedCount: number
  warnings: ImportWarning[]
}

export function parseAppleCareCases(rows: CsvRow[], filePath: string): SupportCaseParseResult {
  const supportCases: AppleSupportCase[] = []
  const warnings: ImportWarning[] = []
  let skippedCount = 0

  rows.forEach((row, index) => {
    const caseNumber = findRowValue(row, ['Case Number', 'Support Case Number', 'Case ID'])
    const deviceHint = compactTextParts([
      findRowValue(row, ['Device Name', 'Product Name', 'Device']),
      findRowValue(row, ['Serial Number']),
    ])

    if (!caseNumber && !deviceHint) {
      skippedCount += 1
      warnings.push({ level: 'warning', message: '支持案例缺少案例号和设备信息，已跳过。', filePath, rowNumber: index + 2 })
      return
    }

    supportCases.push({
      id: createId('case', [caseNumber, deviceHint, index]),
      caseNumber: caseNumber || undefined,
      openedDate: normalizeDate(findRowValue(row, ['Opened Date', 'Created Date', 'Date'])) || undefined,
      closedDate: normalizeDate(findRowValue(row, ['Closed Date', 'Resolved Date'])) || undefined,
      deviceHint: deviceHint || undefined,
      status: findRowValue(row, ['Status']) || undefined,
      issue: findRowValue(row, ['Issue', 'Topic', 'Description']) || undefined,
      raw: row,
    })
  })

  return { supportCases, skippedCount, warnings }
}
