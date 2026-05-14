import type { AppleAsset, AppleTransaction, ImportBatch, ImportedFileSummary, ImportWarning } from '@/features/transactions/transaction-model'
import { parseCsv } from '@/lib/csv'
import { createRuntimeId } from '@/lib/id'
import { detectAppleCsvFile, fileTypeLabel } from './file-detector'
import { parseStoreTransactions } from '@/features/apple-media/parse-store-transactions'
import { parseOnlinePurchaseHistory } from '@/features/apple-store/parse-online-purchase-history'

export interface ImportResult {
  transactions: AppleTransaction[]
  assets: AppleAsset[]
  batch: ImportBatch
  fileBuckets: ImportedFileBucket[]
}

export interface ImportedFileBucket {
  path: string
  transactionIds: string[]
  assetIds: string[]
}

export async function importAppleCsvFiles(files: File[]): Promise<ImportResult> {
  const transactions: AppleTransaction[] = []
  const assets: AppleAsset[] = []
  const summaries: ImportedFileSummary[] = []
  const warnings: ImportWarning[] = []
  const fileBuckets: ImportedFileBucket[] = []

  for (const file of files) {
    const text = await file.text()
    const parsed = await parseCsv(text)
    const type = detectAppleCsvFile(file.name, parsed.fields)

    if (type === 'media_transactions') {
      const result = parseStoreTransactions(parsed.rows, file.name)
      transactions.push(...result.transactions)
      warnings.push(...result.warnings)
      fileBuckets.push({
        path: file.name,
        transactionIds: result.transactions.map((item) => item.id),
        assetIds: [],
      })
      summaries.push({
        path: file.name,
        type: fileTypeLabel(type),
        rowCount: parsed.rows.length,
        parsedCount: result.transactions.length,
        skippedCount: result.skippedCount,
      })
      continue
    }

    if (type === 'online_purchase_history') {
      const result = parseOnlinePurchaseHistory(parsed.rows, file.name)
      transactions.push(...result.transactions)
      assets.push(...result.assets)
      warnings.push(...result.warnings)
      fileBuckets.push({
        path: file.name,
        transactionIds: result.transactions.map((item) => item.id),
        assetIds: result.assets.map((item) => item.id),
      })
      summaries.push({
        path: file.name,
        type: fileTypeLabel(type),
        rowCount: parsed.rows.length,
        parsedCount: result.transactions.length,
        skippedCount: result.skippedCount + result.duplicateCount,
      })
      continue
    }

    summaries.push({
      path: file.name,
      type: fileTypeLabel(type),
      rowCount: parsed.rows.length,
      parsedCount: 0,
      skippedCount: parsed.rows.length,
    })
    warnings.push({ level: 'warning', message: '文件未识别，已跳过。', filePath: file.name })
    fileBuckets.push({ path: file.name, transactionIds: [], assetIds: [] })
  }

  return {
    transactions,
    assets,
    batch: {
      id: createRuntimeId('batch'),
      importedAt: new Date().toISOString(),
      sourceName: 'Apple CSV 导入',
      files: summaries,
      parserVersion: 'v1',
      warnings,
    },
    fileBuckets,
  }
}
