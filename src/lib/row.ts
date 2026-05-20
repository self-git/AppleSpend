import type { CsvRow } from './csv'
import { normalizeFieldName } from '@/features/import/file-signatures'

export function findRowValue(row: CsvRow, candidates: string[]): string {
  const normalizedCandidates = candidates.map((item) => normalizeFieldName(item))
  for (const [key, value] of Object.entries(row)) {
    if (normalizedCandidates.includes(normalizeFieldName(key))) return String(value ?? '').trim()
  }
  return ''
}

export function findFirstPresentField(row: CsvRow, candidates: string[]): string | undefined {
  const normalizedCandidates = candidates.map((item) => normalizeFieldName(item))
  for (const key of Object.keys(row)) {
    if (normalizedCandidates.includes(normalizeFieldName(key))) return key
  }
  return undefined
}

export function compactTextParts(parts: Array<string | undefined | null>): string {
  return parts.map((part) => String(part ?? '').trim()).filter(Boolean).join(' ')
}
