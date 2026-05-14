import Papa from 'papaparse'

export type CsvRow = Record<string, string>

export interface ParsedCsv {
  rows: CsvRow[]
  fields: string[]
}

export function parseCsv(text: string): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
      complete: (result) => {
        const rows = result.data.filter((row) => Object.values(row).some((value) => String(value ?? '').trim()))
        resolve({ rows, fields: result.meta.fields ?? [] })
      },
      error: reject,
    })
  })
}

export function toCsv(rows: CsvRow[]): string {
  return Papa.unparse(rows)
}
