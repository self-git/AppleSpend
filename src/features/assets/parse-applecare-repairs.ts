import type { CsvRow } from '@/lib/csv'
import { normalizeDate } from '@/lib/date'
import { createId } from '@/lib/id'
import { compactTextParts, findRowValue } from '@/lib/row'
import type { AppleCareRepairEvent, ImportWarning } from '@/features/transactions/transaction-model'

export interface RepairParseResult {
  repairEvents: AppleCareRepairEvent[]
  skippedCount: number
  warnings: ImportWarning[]
}

export function parseAppleCareRepairs(rows: CsvRow[], filePath: string): RepairParseResult {
  const repairEvents: AppleCareRepairEvent[] = []
  const warnings: ImportWarning[] = []
  let skippedCount = 0

  rows.forEach((row, index) => {
    const deviceHint = compactTextParts([
      findRowValue(row, ['Device Name', 'Product Name', 'Device']),
      findRowValue(row, ['Serial Number']),
    ])
    const date = normalizeDate(findRowValue(row, ['Repair Date', 'Service Date', 'Date']))

    if (!deviceHint && !date) {
      skippedCount += 1
      warnings.push({ level: 'warning', message: '维修记录缺少设备信息和日期，已跳过。', filePath, rowNumber: index + 2 })
      return
    }

    repairEvents.push({
      id: createId('repair', [deviceHint, date, findRowValue(row, ['Repair ID', 'Service Request Number', 'Issue']), index]),
      date: date || undefined,
      deviceHint: deviceHint || undefined,
      issue: findRowValue(row, ['Issue', 'Problem Description', 'Repair Type']) || undefined,
      repairStatus: findRowValue(row, ['Repair Status', 'Status']) || undefined,
      cost: findRowValue(row, ['Cost', 'Amount', 'Repair Cost']) || undefined,
      currency: findRowValue(row, ['Currency']) || 'CNY',
      raw: row,
    })
  })

  return { repairEvents, skippedCount, warnings }
}
