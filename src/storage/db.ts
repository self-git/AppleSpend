import Dexie, { type Table } from 'dexie'
import type { AppleAsset, AppleTransaction, ImportBatch } from '@/features/transactions/transaction-model'

class AppleLedgerDb extends Dexie {
  transactions!: Table<AppleTransaction, string>
  assets!: Table<AppleAsset, string>
  importBatches!: Table<ImportBatch, string>

  constructor() {
    super('apple-consumption-ledger')
    this.version(1).stores({
      transactions: '&id, source, date, category, paymentMethod, orderNumber',
      assets: '&id, category, purchaseDate, orderNumber, status',
      importBatches: '&id, importedAt',
    })
  }
}

export const db = new AppleLedgerDb()

export async function replaceLedgerData(transactions: AppleTransaction[], assets: AppleAsset[], batch: ImportBatch): Promise<void> {
  await db.transaction('rw', db.transactions, db.assets, db.importBatches, async () => {
    await db.transactions.clear()
    await db.assets.clear()
    await db.importBatches.clear()
    await db.transactions.bulkPut(transactions)
    await db.assets.bulkPut(assets)
    await db.importBatches.put(batch)
  })
}

export async function appendLedgerData(transactions: AppleTransaction[], assets: AppleAsset[], batch: ImportBatch): Promise<void> {
  await db.transaction('rw', db.transactions, db.assets, db.importBatches, async () => {
    if (transactions.length) await db.transactions.bulkPut(transactions)
    if (assets.length) await db.assets.bulkPut(assets)
    await db.importBatches.put(batch)
  })
}

export async function clearLedgerData(): Promise<void> {
  await db.transaction('rw', db.transactions, db.assets, db.importBatches, async () => {
    await db.transactions.clear()
    await db.assets.clear()
    await db.importBatches.clear()
  })
}
