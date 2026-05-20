import { defineStore } from 'pinia'
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
} from './transaction-model'
import type { ImportedFileBucket } from '@/features/import/import-store'
import { appendLedgerData, clearLedgerData, cloneForStorage, db, putRuleSettings, replaceLedgerData, type LedgerDataBundle } from '@/storage/db'
import { buildDataQualityIssues } from '@/features/data-quality/data-quality-selectors'
import { classifyHardware } from '@/features/apple-store/classify-hardware'

export interface IncrementalImportMeta {
  fileBuckets: ImportedFileBucket[]
}

export interface ImportDataPayload {
  transactions: AppleTransaction[]
  assets: AppleAsset[]
  subscriptions: AppleSubscription[]
  subscriptionEvents: AppleSubscriptionEvent[]
  storeCreditEntries: StoreCreditEntry[]
  deviceLifecycles: AppleDeviceLifecycle[]
  repairEvents: AppleCareRepairEvent[]
  supportCases: AppleSupportCase[]
  deviceAppearances: AppleDeviceAppearance[]
  paymentEvidence: PaymentEvidence[]
  dataQualityIssues: DataQualityIssue[]
  batch: ImportBatch
}

function createLedgerBundle(payload: ImportDataPayload, ruleSettings: RuleSetting[]): LedgerDataBundle {
  return {
    transactions: payload.transactions,
    assets: payload.assets,
    batches: [payload.batch],
    subscriptions: payload.subscriptions,
    subscriptionEvents: payload.subscriptionEvents,
    storeCreditEntries: payload.storeCreditEntries,
    deviceLifecycles: payload.deviceLifecycles,
    repairEvents: payload.repairEvents,
    supportCases: payload.supportCases,
    deviceAppearances: payload.deviceAppearances,
    paymentEvidence: payload.paymentEvidence,
    dataQualityIssues: payload.dataQualityIssues,
    ruleSettings,
  }
}

function dedupeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const seen = new Set(existing.map((item) => item.id))
  return incoming.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function normalizeHardwareCategories(transactions: AppleTransaction[], assets: AppleAsset[]) {
  let changed = false
  const normalizedTransactions = transactions.map((transaction) => {
    if (transaction.source !== 'apple_store' && transaction.source !== 'external_retail') return transaction
    const category = classifyHardware(transaction.title)
    if (category === transaction.category) return transaction
    changed = true
    return { ...transaction, category }
  })
  const normalizedAssets = assets.map((asset) => {
    const category = classifyHardware(asset.name)
    if (category === asset.category) return asset
    changed = true
    return { ...asset, category }
  })

  return { transactions: normalizedTransactions, assets: normalizedAssets, changed }
}

export const useTransactionStore = defineStore('transactions', {
  state: () => ({
    transactions: [] as AppleTransaction[],
    assets: [] as AppleAsset[],
    batches: [] as ImportBatch[],
    subscriptions: [] as AppleSubscription[],
    subscriptionEvents: [] as AppleSubscriptionEvent[],
    storeCreditEntries: [] as StoreCreditEntry[],
    deviceLifecycles: [] as AppleDeviceLifecycle[],
    repairEvents: [] as AppleCareRepairEvent[],
    supportCases: [] as AppleSupportCase[],
    deviceAppearances: [] as AppleDeviceAppearance[],
    paymentEvidence: [] as PaymentEvidence[],
    dataQualityIssues: [] as DataQualityIssue[],
    ruleSettings: [] as RuleSetting[],
    loaded: false,
  }),
  getters: {
    hasData: (state) =>
      state.transactions.length > 0 ||
      state.assets.length > 0 ||
      state.subscriptions.length > 0 ||
      state.storeCreditEntries.length > 0,
    categories: (state) => Array.from(new Set(state.transactions.map((item) => item.category))).sort(),
    sources: (state) => Array.from(new Set(state.transactions.map((item) => item.source))).sort(),
    paymentMethods: (state) => Array.from(new Set(state.transactions.map((item) => item.paymentMethod).filter(Boolean))) as string[],
    years: (state) =>
      Array.from(new Set(state.transactions.map((item) => item.date.slice(0, 4)).filter(Boolean))).sort((a, b) => b.localeCompare(a)),
    activeIssueCount: (state) => state.dataQualityIssues.filter((item) => !item.dismissed).length,
  },
  actions: {
    async loadFromStorage() {
      const [
        transactions,
        assets,
        batches,
        subscriptions,
        subscriptionEvents,
        storeCreditEntries,
        deviceLifecycles,
        repairEvents,
        supportCases,
        deviceAppearances,
        paymentEvidence,
        dataQualityIssues,
        ruleSettings,
      ] = await Promise.all([
        db.transactions.toArray(),
        db.assets.toArray(),
        db.importBatches.orderBy('importedAt').reverse().toArray(),
        db.subscriptions.toArray(),
        db.subscriptionEvents.toArray(),
        db.storeCreditEntries.toArray(),
        db.deviceLifecycles.toArray(),
        db.repairEvents.toArray(),
        db.supportCases.toArray(),
        db.deviceAppearances.toArray(),
        db.paymentEvidence.toArray(),
        db.dataQualityIssues.toArray(),
        db.ruleSettings.toArray(),
      ])
      const normalized = normalizeHardwareCategories(transactions, assets)
      if (normalized.changed) {
        await db.transaction('rw', [db.transactions, db.assets], async () => {
          await db.transactions.bulkPut(cloneForStorage(normalized.transactions))
          await db.assets.bulkPut(cloneForStorage(normalized.assets))
        })
      }
      this.transactions = normalized.transactions
      this.assets = normalized.assets
      this.batches = batches
      this.subscriptions = subscriptions
      this.subscriptionEvents = subscriptionEvents
      this.storeCreditEntries = storeCreditEntries
      this.deviceLifecycles = deviceLifecycles
      this.repairEvents = repairEvents
      this.supportCases = supportCases
      this.deviceAppearances = deviceAppearances
      this.paymentEvidence = paymentEvidence
      this.dataQualityIssues = dataQualityIssues
      this.ruleSettings = ruleSettings
      this.loaded = true
      await this.refreshDataQualityIssues(dataQualityIssues)
    },
    async replaceAll(payload: ImportDataPayload) {
      const bundle = createLedgerBundle(payload, this.ruleSettings)
      await replaceLedgerData(bundle)
      this.transactions = payload.transactions
      this.assets = payload.assets
      this.batches = [payload.batch]
      this.subscriptions = payload.subscriptions
      this.subscriptionEvents = payload.subscriptionEvents
      this.storeCreditEntries = payload.storeCreditEntries
      this.deviceLifecycles = payload.deviceLifecycles
      this.repairEvents = payload.repairEvents
      this.supportCases = payload.supportCases
      this.deviceAppearances = payload.deviceAppearances
      this.paymentEvidence = payload.paymentEvidence
      this.dataQualityIssues = buildDataQualityIssues({
        importedIssues: payload.dataQualityIssues,
        transactions: this.transactions,
        assets: this.assets,
        subscriptions: this.subscriptions,
        storeCreditEntries: this.storeCreditEntries,
        lifecycles: this.deviceLifecycles,
        repairEvents: this.repairEvents,
        supportCases: this.supportCases,
        deviceAppearances: this.deviceAppearances,
        paymentEvidence: this.paymentEvidence,
        ruleSettings: this.ruleSettings,
      })
      await db.dataQualityIssues.clear()
      if (this.dataQualityIssues.length) await db.dataQualityIssues.bulkPut(cloneForStorage(this.dataQualityIssues))
      this.loaded = true
    },
    async appendImport(payload: ImportDataPayload, meta: IncrementalImportMeta) {
      const newTransactions = dedupeById(this.transactions, payload.transactions)
      const newAssets = dedupeById(this.assets, payload.assets)
      const newSubscriptions = dedupeById(this.subscriptions, payload.subscriptions)
      const newSubscriptionEvents = dedupeById(this.subscriptionEvents, payload.subscriptionEvents)
      const newStoreCreditEntries = dedupeById(this.storeCreditEntries, payload.storeCreditEntries)
      const newRepairEvents = dedupeById(this.repairEvents, payload.repairEvents)
      const newSupportCases = dedupeById(this.supportCases, payload.supportCases)
      const newDeviceAppearances = dedupeById(this.deviceAppearances, payload.deviceAppearances)
      const newPaymentEvidence = dedupeById(this.paymentEvidence, payload.paymentEvidence)
      const lifecycleMap = new Map(this.deviceLifecycles.map((item) => [item.assetId, item]))
      const newDeviceLifecycles = payload.deviceLifecycles.filter((item) => !lifecycleMap.has(item.assetId))
      const insertedIds = {
        transactions: new Set(newTransactions.map((item) => item.id)),
        assets: new Set(newAssets.map((item) => item.id)),
        subscriptions: new Set(newSubscriptions.map((item) => item.id)),
        subscriptionEvents: new Set(newSubscriptionEvents.map((item) => item.id)),
        storeCreditEntries: new Set(newStoreCreditEntries.map((item) => item.id)),
        repairEvents: new Set(newRepairEvents.map((item) => item.id)),
        supportCases: new Set(newSupportCases.map((item) => item.id)),
        deviceAppearances: new Set(newDeviceAppearances.map((item) => item.id)),
        paymentEvidence: new Set(newPaymentEvidence.map((item) => item.id)),
        deviceLifecycles: new Set(newDeviceLifecycles.map((item) => item.assetId)),
      }

      payload.batch.files = payload.batch.files.map((file) => {
        const bucket = meta.fileBuckets.find((item) => item.path === file.path)
        if (!bucket) return file
        const insertedCount =
          bucket.transactionIds.filter((id) => insertedIds.transactions.has(id)).length +
          bucket.assetIds.filter((id) => insertedIds.assets.has(id)).length +
          bucket.subscriptionIds.filter((id) => insertedIds.subscriptions.has(id)).length +
          bucket.subscriptionEventIds.filter((id) => insertedIds.subscriptionEvents.has(id)).length +
          bucket.storeCreditEntryIds.filter((id) => insertedIds.storeCreditEntries.has(id)).length +
          bucket.deviceLifecycleIds.filter((id) => insertedIds.deviceLifecycles.has(id)).length +
          bucket.repairEventIds.filter((id) => insertedIds.repairEvents.has(id)).length +
          bucket.supportCaseIds.filter((id) => insertedIds.supportCases.has(id)).length +
          bucket.deviceAppearanceIds.filter((id) => insertedIds.deviceAppearances.has(id)).length +
          bucket.paymentEvidenceIds.filter((id) => insertedIds.paymentEvidence.has(id)).length

        const totalEntityCount =
          bucket.transactionIds.length +
          bucket.assetIds.length +
          bucket.subscriptionIds.length +
          bucket.subscriptionEventIds.length +
          bucket.storeCreditEntryIds.length +
          bucket.deviceLifecycleIds.length +
          bucket.repairEventIds.length +
          bucket.supportCaseIds.length +
          bucket.deviceAppearanceIds.length +
          bucket.paymentEvidenceIds.length

        const duplicateCount = Math.max(totalEntityCount - insertedCount, 0)
        return {
          ...file,
          insertedCount,
          duplicateCount,
          skippedCount: file.skippedCount + duplicateCount,
        }
      })

      await appendLedgerData({
        transactions: newTransactions,
        assets: newAssets,
        batches: [payload.batch],
        subscriptions: newSubscriptions,
        subscriptionEvents: newSubscriptionEvents,
        storeCreditEntries: newStoreCreditEntries,
        deviceLifecycles: newDeviceLifecycles,
        repairEvents: newRepairEvents,
        supportCases: newSupportCases,
        deviceAppearances: newDeviceAppearances,
        paymentEvidence: newPaymentEvidence,
        dataQualityIssues: [],
      })

      this.transactions = [...this.transactions, ...newTransactions]
      this.assets = [...this.assets, ...newAssets]
      this.batches = [payload.batch, ...this.batches]
      this.subscriptions = [...this.subscriptions, ...newSubscriptions]
      this.subscriptionEvents = [...this.subscriptionEvents, ...newSubscriptionEvents]
      this.storeCreditEntries = [...this.storeCreditEntries, ...newStoreCreditEntries]
      this.deviceLifecycles = [...this.deviceLifecycles, ...newDeviceLifecycles]
      this.repairEvents = [...this.repairEvents, ...newRepairEvents]
      this.supportCases = [...this.supportCases, ...newSupportCases]
      this.deviceAppearances = [...this.deviceAppearances, ...newDeviceAppearances]
      this.paymentEvidence = [...this.paymentEvidence, ...newPaymentEvidence]
      this.dataQualityIssues = buildDataQualityIssues({
        importedIssues: payload.dataQualityIssues,
        transactions: this.transactions,
        assets: this.assets,
        subscriptions: this.subscriptions,
        storeCreditEntries: this.storeCreditEntries,
        lifecycles: this.deviceLifecycles,
        repairEvents: this.repairEvents,
        supportCases: this.supportCases,
        deviceAppearances: this.deviceAppearances,
        paymentEvidence: this.paymentEvidence,
        ruleSettings: this.ruleSettings,
        dismissedIds: this.dataQualityIssues.filter((item) => item.dismissed).map((item) => item.id),
      })
      await db.dataQualityIssues.clear()
      if (this.dataQualityIssues.length) await db.dataQualityIssues.bulkPut(cloneForStorage(this.dataQualityIssues))
      this.loaded = true

      return {
        insertedTransactions: newTransactions.length,
        insertedAssets: newAssets.length,
        duplicateTransactions: payload.transactions.length - newTransactions.length,
        duplicateAssets: payload.assets.length - newAssets.length,
      }
    },
    async clearAll() {
      await clearLedgerData()
      this.transactions = []
      this.assets = []
      this.batches = []
      this.subscriptions = []
      this.subscriptionEvents = []
      this.storeCreditEntries = []
      this.deviceLifecycles = []
      this.repairEvents = []
      this.supportCases = []
      this.deviceAppearances = []
      this.paymentEvidence = []
      this.dataQualityIssues = []
      this.ruleSettings = []
      this.loaded = true
    },
    async updateAssetStatus(assetId: string, status: AppleAsset['status']) {
      const asset = this.assets.find((item) => item.id === assetId)
      if (!asset) return
      asset.status = status
      await db.assets.put(cloneForStorage(asset))
    },
    async upsertDeviceLifecycle(patch: AppleDeviceLifecycle) {
      const existingIndex = this.deviceLifecycles.findIndex((item) => item.assetId === patch.assetId)
      if (existingIndex >= 0) {
        this.deviceLifecycles.splice(existingIndex, 1, patch)
      } else {
        this.deviceLifecycles.push(patch)
      }
      await db.deviceLifecycles.put(cloneForStorage(patch))
      await this.refreshDataQualityIssues()
    },
    async upsertSubscription(subscription: AppleSubscription) {
      const index = this.subscriptions.findIndex((item) => item.id === subscription.id)
      if (index >= 0) {
        this.subscriptions.splice(index, 1, subscription)
      } else {
        this.subscriptions.push(subscription)
      }
      await db.subscriptions.put(cloneForStorage(subscription))
      await this.refreshDataQualityIssues()
    },
    async dismissIssue(issueId: string, dismissed = true) {
      const issue = this.dataQualityIssues.find((item) => item.id === issueId)
      if (!issue) return
      issue.dismissed = dismissed
      await db.dataQualityIssues.put(cloneForStorage(issue))
    },
    async saveRuleSettings(ruleSettings: RuleSetting[]) {
      this.ruleSettings = ruleSettings
      await putRuleSettings(ruleSettings)
      await this.refreshDataQualityIssues()
    },
    exportBackup(redacted = false): string {
      const payload = {
        exportedAt: new Date().toISOString(),
        redacted,
        transactions: this.transactions.map((item) => serializeRecord(item, redacted)),
        assets: this.assets.map((item) => serializeRecord(item, redacted)),
        subscriptions: this.subscriptions.map((item) => serializeRecord(item, redacted)),
        subscriptionEvents: this.subscriptionEvents.map((item) => serializeRecord(item, redacted)),
        storeCreditEntries: this.storeCreditEntries.map((item) => serializeRecord(item, redacted)),
        deviceLifecycles: this.deviceLifecycles.map((item) => serializeRecord(item, redacted)),
        repairEvents: this.repairEvents.map((item) => serializeRecord(item, redacted)),
        supportCases: this.supportCases.map((item) => serializeRecord(item, redacted)),
        deviceAppearances: this.deviceAppearances.map((item) => serializeRecord(item, redacted)),
        paymentEvidence: this.paymentEvidence.map((item) => serializeRecord(item, redacted)),
        dataQualityIssues: this.dataQualityIssues.map((item) => serializeRecord(item, redacted)),
        ruleSettings: this.ruleSettings.map((item) => serializeRecord(item, false)),
        batches: this.batches.map((item) => serializeRecord(item, false)),
      }
      return JSON.stringify(payload, null, 2)
    },
    async refreshDataQualityIssues(importedIssues: DataQualityIssue[] = []) {
      const dismissedIds = this.dataQualityIssues.filter((item) => item.dismissed).map((item) => item.id)
      this.dataQualityIssues = buildDataQualityIssues({
        importedIssues,
        transactions: this.transactions,
        assets: this.assets,
        subscriptions: this.subscriptions,
        storeCreditEntries: this.storeCreditEntries,
        lifecycles: this.deviceLifecycles,
        repairEvents: this.repairEvents,
        supportCases: this.supportCases,
        deviceAppearances: this.deviceAppearances,
        paymentEvidence: this.paymentEvidence,
        ruleSettings: this.ruleSettings,
        dismissedIds,
      })
      await db.dataQualityIssues.clear()
      if (this.dataQualityIssues.length) await db.dataQualityIssues.bulkPut(cloneForStorage(this.dataQualityIssues))
    },
  },
})

function serializeRecord<T>(record: T, redacted: boolean): T {
  if (!redacted) return record
  return JSON.parse(
    JSON.stringify(record, (key, value) => {
      if (typeof value !== 'string') return value
      if (!key) return value
      const sensitiveKey = /(order|serial|invoice|case|reference|number|street|name)$/i.test(key)
      if (!sensitiveKey) return value
      if (value.length <= 4) return '****'
      return `${value.slice(0, 2)}****${value.slice(-2)}`
    }),
  ) as T
}
