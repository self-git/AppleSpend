import type { CsvRow } from '@/lib/csv'

export function hardwareDedupeKey(row: CsvRow): string {
  return [
    row['Customer Order Number'] ?? '',
    row['Line Item'] ?? '',
    row.Description ?? '',
    row['Price Including Tax'] ?? '',
  ]
    .map((part) => String(part).trim())
    .join('|')
}

export function isBlankSummaryRow(row: CsvRow): boolean {
  return !String(row.Description ?? '').trim() && !String(row['Customer Order Number'] ?? '').trim()
}
