import type { CsvRow } from '@/lib/csv'
import { normalizeDate } from '@/lib/date'
import { createId } from '@/lib/id'
import { findRowValue } from '@/lib/row'
import type { AppleDeviceAppearance, ImportWarning } from '@/features/transactions/transaction-model'

export interface DeviceInformationParseResult {
  appearances: AppleDeviceAppearance[]
  skippedCount: number
  warnings: ImportWarning[]
}

export function parseAppleIdDeviceInformation(rows: CsvRow[], filePath: string): DeviceInformationParseResult {
  const appearances: AppleDeviceAppearance[] = []
  const warnings: ImportWarning[] = []
  let skippedCount = 0

  rows.forEach((row, index) => {
    const deviceName = findRowValue(row, ['Device Name', 'Name'])
    const modelIdentifier = findRowValue(row, ['Model Identifier', 'Model'])
    const lastSeenDate = normalizeDate(findRowValue(row, ['Last Seen Date', 'Last Active Date', 'Last Seen']))

    if (!deviceName && !modelIdentifier) {
      skippedCount += 1
      warnings.push({ level: 'warning', message: '设备信息缺少设备名称和型号，已跳过。', filePath, rowNumber: index + 2 })
      return
    }

    appearances.push({
      id: createId('device', [deviceName, modelIdentifier, findRowValue(row, ['Serial Number']), index]),
      deviceName: deviceName || undefined,
      modelIdentifier: modelIdentifier || undefined,
      serialNumber: findRowValue(row, ['Serial Number']) || undefined,
      platform: findRowValue(row, ['Platform', 'Device Type']) || undefined,
      osVersion: findRowValue(row, ['OS Version', 'Software Version']) || undefined,
      firstSeenDate: normalizeDate(findRowValue(row, ['First Seen Date', 'First Active Date'])) || undefined,
      lastSeenDate: lastSeenDate || undefined,
      raw: row,
    })
  })

  return { appearances, skippedCount, warnings }
}
