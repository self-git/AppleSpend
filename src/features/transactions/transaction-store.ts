import { defineStore } from 'pinia'
import type { AppleAsset, AppleTransaction, ImportBatch } from './transaction-model'
import type { ImportedFileBucket } from '@/features/import/import-store'
import { appendLedgerData, clearLedgerData, db, replaceLedgerData } from '@/storage/db'

export interface IncrementalImportMeta {
  fileBuckets: ImportedFileBucket[]
}

export const useTransactionStore = defineStore('transactions', {
  state: () => ({
    transactions: [] as AppleTransaction[],
    assets: [] as AppleAsset[],
    batches: [] as ImportBatch[],
    loaded: false,
  }),
  getters: {
    hasData: (state) => state.transactions.length > 0,
    categories: (state) => Array.from(new Set(state.transactions.map((item) => item.category))).sort(),
    sources: (state) => Array.from(new Set(state.transactions.map((item) => item.source))).sort(),
    paymentMethods: (state) => Array.from(new Set(state.transactions.map((item) => item.paymentMethod).filter(Boolean))) as string[],
    years: (state) =>
      Array.from(new Set(state.transactions.map((item) => item.date.slice(0, 4)).filter(Boolean))).sort((a, b) => b.localeCompare(a)),
  },
  actions: {
    async loadFromStorage() {
      const [transactions, assets, batches] = await Promise.all([
        db.transactions.toArray(),
        db.assets.toArray(),
        db.importBatches.orderBy('importedAt').reverse().toArray(),
      ])
      this.transactions = transactions
      this.assets = assets
      this.batches = batches
      this.loaded = true
    },
    async replaceAll(transactions: AppleTransaction[], assets: AppleAsset[], batch: ImportBatch) {
      await replaceLedgerData(transactions, assets, batch)
      this.transactions = transactions
      this.assets = assets
      this.batches = [batch]
      this.loaded = true
    },
    async appendImport(transactions: AppleTransaction[], assets: AppleAsset[], batch: ImportBatch, meta: IncrementalImportMeta) {
      const existingTransactionIds = new Set(this.transactions.map((item) => item.id))
      const existingAssetIds = new Set(this.assets.map((item) => item.id))
      const seenTransactionIds = new Set(existingTransactionIds)
      const seenAssetIds = new Set(existingAssetIds)
      const newTransactions = transactions.filter((item) => {
        if (seenTransactionIds.has(item.id)) return false
        seenTransactionIds.add(item.id)
        return true
      })
      const newAssets = assets.filter((item) => {
        if (seenAssetIds.has(item.id)) return false
        seenAssetIds.add(item.id)
        return true
      })
      const insertedTransactionIds = new Set(newTransactions.map((item) => item.id))
      const insertedAssetIds = new Set(newAssets.map((item) => item.id))

      batch.files = batch.files.map((file) => {
        const bucket = meta.fileBuckets.find((item) => item.path === file.path)
        if (!bucket) return file
        const insertedCount = bucket.transactionIds.filter((id) => insertedTransactionIds.has(id)).length
        const duplicateCount = Math.max(bucket.transactionIds.length - insertedCount, 0)
        return {
          ...file,
          insertedCount,
          duplicateCount,
          skippedCount: file.skippedCount + duplicateCount,
        }
      })

      if (newTransactions.length || newAssets.length) {
        await appendLedgerData(newTransactions, newAssets, batch)
      } else {
        await db.importBatches.put(batch)
      }

      this.transactions = [...this.transactions, ...newTransactions]
      this.assets = [...this.assets, ...newAssets]
      this.batches = [batch, ...this.batches]
      this.loaded = true

      return {
        insertedTransactions: newTransactions.length,
        insertedAssets: newAssets.length,
        duplicateTransactions: transactions.length - newTransactions.length,
        duplicateAssets: assets.length - newAssets.length,
      }
    },
    async clearAll() {
      await clearLedgerData()
      this.transactions = []
      this.assets = []
      this.batches = []
      this.loaded = true
    },
    async updateAssetStatus(assetId: string, status: AppleAsset['status']) {
      const asset = this.assets.find((item) => item.id === assetId)
      if (!asset) return
      asset.status = status
      await db.assets.put(asset)
    },
  },
})
