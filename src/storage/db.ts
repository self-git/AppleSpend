import Dexie, { type Table } from 'dexie'
import type {
  AppleAsset,
  AppleCareRepairEvent,
  AppleDeviceAppearance,
  AppleDeviceLifecycle,
  AppleSubscription,
  AppleSubscriptionEvent,
  AppleSupportCase,
  AppleTransaction,
  DataQualityIssue,
  ImportBatch,
  PaymentEvidence,
  RuleSetting,
  StoreCreditEntry,
} from '@/features/transactions/transaction-model'

class AppleLedgerDb extends Dexie {
  transactions!: Table<AppleTransaction, string>
  assets!: Table<AppleAsset, string>
  importBatches!: Table<ImportBatch, string>
  subscriptions!: Table<AppleSubscription, string>
  subscriptionEvents!: Table<AppleSubscriptionEvent, string>
  storeCreditEntries!: Table<StoreCreditEntry, string>
  deviceLifecycles!: Table<AppleDeviceLifecycle, string>
  repairEvents!: Table<AppleCareRepairEvent, string>
  supportCases!: Table<AppleSupportCase, string>
  deviceAppearances!: Table<AppleDeviceAppearance, string>
  paymentEvidence!: Table<PaymentEvidence, string>
  dataQualityIssues!: Table<DataQualityIssue, string>
  ruleSettings!: Table<RuleSetting, string>

  constructor() {
    super('apple-consumption-ledger')
    this.version(1).stores({
      transactions: '&id, source, date, category, paymentMethod, orderNumber',
      assets: '&id, category, purchaseDate, orderNumber, status',
      importBatches: '&id, importedAt',
    })
    this.version(2).stores({
      transactions: '&id, source, date, category, paymentMethod, orderNumber',
      assets: '&id, category, purchaseDate, orderNumber, status',
      importBatches: '&id, importedAt',
      subscriptions: '&id, serviceName, status, latestEventDate',
      subscriptionEvents: '&id, subscriptionId, date, eventType',
      storeCreditEntries: '&id, date, direction, relatedTransactionId',
      deviceLifecycles: '&assetId, status, serialNumber, isPrimaryDevice',
      repairEvents: '&id, relatedAssetId, date',
      supportCases: '&id, relatedAssetId, openedDate, status',
      deviceAppearances: '&id, relatedAssetId, lastSeenDate, serialNumber',
      paymentEvidence: '&id, date, orderNumber, paymentMethod',
      dataQualityIssues: '&id, severity, type, dismissed',
      ruleSettings: '&id, type, enabled, updatedAt',
    })
  }
}

export const db = new AppleLedgerDb()

export function cloneForStorage<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export interface LedgerDataBundle {
  transactions: AppleTransaction[]
  assets: AppleAsset[]
  batches: ImportBatch[]
  subscriptions: AppleSubscription[]
  subscriptionEvents: AppleSubscriptionEvent[]
  storeCreditEntries: StoreCreditEntry[]
  deviceLifecycles: AppleDeviceLifecycle[]
  repairEvents: AppleCareRepairEvent[]
  supportCases: AppleSupportCase[]
  deviceAppearances: AppleDeviceAppearance[]
  paymentEvidence: PaymentEvidence[]
  dataQualityIssues: DataQualityIssue[]
  ruleSettings: RuleSetting[]
}

export async function replaceLedgerData(bundle: LedgerDataBundle): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.transactions,
      db.assets,
      db.importBatches,
      db.subscriptions,
      db.subscriptionEvents,
      db.storeCreditEntries,
      db.deviceLifecycles,
      db.repairEvents,
      db.supportCases,
      db.deviceAppearances,
      db.paymentEvidence,
      db.dataQualityIssues,
      db.ruleSettings,
    ],
    async () => {
    await db.transactions.clear()
    await db.assets.clear()
    await db.importBatches.clear()
      await db.subscriptions.clear()
      await db.subscriptionEvents.clear()
      await db.storeCreditEntries.clear()
      await db.deviceLifecycles.clear()
      await db.repairEvents.clear()
      await db.supportCases.clear()
      await db.deviceAppearances.clear()
      await db.paymentEvidence.clear()
      await db.dataQualityIssues.clear()
      if (bundle.transactions.length) await db.transactions.bulkPut(cloneForStorage(bundle.transactions))
      if (bundle.assets.length) await db.assets.bulkPut(cloneForStorage(bundle.assets))
      if (bundle.batches.length) await db.importBatches.bulkPut(cloneForStorage(bundle.batches))
      if (bundle.subscriptions.length) await db.subscriptions.bulkPut(cloneForStorage(bundle.subscriptions))
      if (bundle.subscriptionEvents.length) await db.subscriptionEvents.bulkPut(cloneForStorage(bundle.subscriptionEvents))
      if (bundle.storeCreditEntries.length) await db.storeCreditEntries.bulkPut(cloneForStorage(bundle.storeCreditEntries))
      if (bundle.deviceLifecycles.length) await db.deviceLifecycles.bulkPut(cloneForStorage(bundle.deviceLifecycles))
      if (bundle.repairEvents.length) await db.repairEvents.bulkPut(cloneForStorage(bundle.repairEvents))
      if (bundle.supportCases.length) await db.supportCases.bulkPut(cloneForStorage(bundle.supportCases))
      if (bundle.deviceAppearances.length) await db.deviceAppearances.bulkPut(cloneForStorage(bundle.deviceAppearances))
      if (bundle.paymentEvidence.length) await db.paymentEvidence.bulkPut(cloneForStorage(bundle.paymentEvidence))
      if (bundle.dataQualityIssues.length) await db.dataQualityIssues.bulkPut(cloneForStorage(bundle.dataQualityIssues))
      if (bundle.ruleSettings.length) await db.ruleSettings.bulkPut(cloneForStorage(bundle.ruleSettings))
    },
  )
}

export async function appendLedgerData(bundle: Omit<LedgerDataBundle, 'ruleSettings'> & { ruleSettings?: RuleSetting[] }): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.transactions,
      db.assets,
      db.importBatches,
      db.subscriptions,
      db.subscriptionEvents,
      db.storeCreditEntries,
      db.deviceLifecycles,
      db.repairEvents,
      db.supportCases,
      db.deviceAppearances,
      db.paymentEvidence,
      db.dataQualityIssues,
    ],
    async () => {
      if (bundle.transactions.length) await db.transactions.bulkPut(cloneForStorage(bundle.transactions))
      if (bundle.assets.length) await db.assets.bulkPut(cloneForStorage(bundle.assets))
      if (bundle.batches.length) await db.importBatches.bulkPut(cloneForStorage(bundle.batches))
      if (bundle.subscriptions.length) await db.subscriptions.bulkPut(cloneForStorage(bundle.subscriptions))
      if (bundle.subscriptionEvents.length) await db.subscriptionEvents.bulkPut(cloneForStorage(bundle.subscriptionEvents))
      if (bundle.storeCreditEntries.length) await db.storeCreditEntries.bulkPut(cloneForStorage(bundle.storeCreditEntries))
      if (bundle.deviceLifecycles.length) await db.deviceLifecycles.bulkPut(cloneForStorage(bundle.deviceLifecycles))
      if (bundle.repairEvents.length) await db.repairEvents.bulkPut(cloneForStorage(bundle.repairEvents))
      if (bundle.supportCases.length) await db.supportCases.bulkPut(cloneForStorage(bundle.supportCases))
      if (bundle.deviceAppearances.length) await db.deviceAppearances.bulkPut(cloneForStorage(bundle.deviceAppearances))
      if (bundle.paymentEvidence.length) await db.paymentEvidence.bulkPut(cloneForStorage(bundle.paymentEvidence))
      if (bundle.dataQualityIssues.length) await db.dataQualityIssues.bulkPut(cloneForStorage(bundle.dataQualityIssues))
    },
  )
}

export async function putRuleSettings(ruleSettings: RuleSetting[]): Promise<void> {
  await db.transaction('rw', db.ruleSettings, async () => {
    await db.ruleSettings.clear()
    if (ruleSettings.length) await db.ruleSettings.bulkPut(cloneForStorage(ruleSettings))
  })
}

export async function clearLedgerData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.transactions,
      db.assets,
      db.importBatches,
      db.subscriptions,
      db.subscriptionEvents,
      db.storeCreditEntries,
      db.deviceLifecycles,
      db.repairEvents,
      db.supportCases,
      db.deviceAppearances,
      db.paymentEvidence,
      db.dataQualityIssues,
      db.ruleSettings,
    ],
    async () => {
    await db.transactions.clear()
    await db.assets.clear()
    await db.importBatches.clear()
      await db.subscriptions.clear()
      await db.subscriptionEvents.clear()
      await db.storeCreditEntries.clear()
      await db.deviceLifecycles.clear()
      await db.repairEvents.clear()
      await db.supportCases.clear()
      await db.deviceAppearances.clear()
      await db.paymentEvidence.clear()
      await db.dataQualityIssues.clear()
      await db.ruleSettings.clear()
    },
  )
}
