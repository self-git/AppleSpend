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
  ImportedFileSummary,
  ImportWarning,
  PaymentEvidence,
  StoreCreditEntry,
} from '@/features/transactions/transaction-model'
import { parseCsv } from '@/lib/csv'
import { createId, createRuntimeId } from '@/lib/id'
import { parseOnlinePurchaseHistory } from '@/features/apple-store/parse-online-purchase-history'
import { parseStoreTransactions } from '@/features/apple-media/parse-store-transactions'
import { parseSubscriptionHistory } from '@/features/subscriptions/parse-subscription-history'
import { parseStoreCreditHistory } from '@/features/store-credit/parse-store-credit-history'
import { parseAppleCareRepairs } from '@/features/assets/parse-applecare-repairs'
import { parseAppleCareCases } from '@/features/assets/parse-applecare-cases'
import { parseAppleIdDeviceInformation } from '@/features/assets/parse-apple-id-device-information'
import { parsePaymentEvidence } from '@/features/payments/parse-payment-evidence'
import { expandImportFiles } from './archive-reader'
import { detectAppleCsvFile, fileTypeLabel, type AppleCsvFileType } from './file-detector'

export interface ImportResult {
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
  fileBuckets: ImportedFileBucket[]
}

export interface ImportedFileBucket {
  path: string
  transactionIds: string[]
  assetIds: string[]
  subscriptionIds: string[]
  subscriptionEventIds: string[]
  storeCreditEntryIds: string[]
  deviceLifecycleIds: string[]
  repairEventIds: string[]
  supportCaseIds: string[]
  deviceAppearanceIds: string[]
  paymentEvidenceIds: string[]
  issueIds: string[]
}

export async function importAppleCsvFiles(files: File[]): Promise<ImportResult> {
  const transactions: AppleTransaction[] = []
  const assets: AppleAsset[] = []
  const subscriptions: AppleSubscription[] = []
  const subscriptionEvents: AppleSubscriptionEvent[] = []
  const storeCreditEntries: StoreCreditEntry[] = []
  const deviceLifecycles: AppleDeviceLifecycle[] = []
  const repairEvents: AppleCareRepairEvent[] = []
  const supportCases: AppleSupportCase[] = []
  const deviceAppearances: AppleDeviceAppearance[] = []
  const paymentEvidence: PaymentEvidence[] = []
  const dataQualityIssues: DataQualityIssue[] = []
  const summaries: ImportedFileSummary[] = []
  const warnings: ImportWarning[] = []
  const fileBuckets: ImportedFileBucket[] = []

  const expandedFiles = await expandImportFiles(files)

  for (const file of expandedFiles) {
    const text = await file.text()
    const parsed = await parseCsv(text)
    const detected = detectAppleCsvFile(file.path, parsed.fields)
    const bucket = createEmptyBucket(file.path)
    const fileWarnings: ImportWarning[] = []
    const fileIssues: DataQualityIssue[] = []

    if (detected.ambiguous) {
      const issue = createImportIssue('ambiguous_file_type', 'warning', file.path, `文件可能同时匹配 ${detected.candidates.join(' / ')}。`, bucket)
      fileIssues.push(issue)
      warnings.push({ level: 'warning', message: '文件类型存在歧义，已按最高分类型解析。', filePath: file.path })
    }

    if (detected.type === 'media_transactions') {
      const result = parseStoreTransactions(parsed.rows, file.path)
      transactions.push(...result.transactions)
      fileWarnings.push(...result.warnings)
      bucket.transactionIds.push(...result.transactions.map((item) => item.id))
      summaries.push(buildSummary(file.path, detected.type, parsed.rows.length, result.transactions.length, result.skippedCount, result.warnings.length))
    } else if (detected.type === 'online_purchase_history') {
      const result = parseOnlinePurchaseHistory(parsed.rows, file.path)
      transactions.push(...result.transactions)
      assets.push(...result.assets)
      deviceLifecycles.push(...result.assets.map((item) => createLifecycleFromAsset(item)))
      fileWarnings.push(...result.warnings)
      bucket.transactionIds.push(...result.transactions.map((item) => item.id))
      bucket.assetIds.push(...result.assets.map((item) => item.id))
      bucket.deviceLifecycleIds.push(...result.assets.map((item) => item.id))
      summaries.push(
        buildSummary(file.path, detected.type, parsed.rows.length, result.transactions.length + result.assets.length, result.skippedCount + result.duplicateCount, result.warnings.length),
      )
    } else if (detected.type === 'subscription_history') {
      const result = parseSubscriptionHistory(parsed.rows, file.path)
      subscriptions.push(...result.subscriptions)
      subscriptionEvents.push(...result.events)
      fileWarnings.push(...result.warnings)
      bucket.subscriptionIds.push(...result.subscriptions.map((item) => item.id))
      bucket.subscriptionEventIds.push(...result.events.map((item) => item.id))
      summaries.push(buildSummary(file.path, detected.type, parsed.rows.length, result.subscriptions.length + result.events.length, result.skippedCount, result.warnings.length))
    } else if (detected.type === 'store_credit_history') {
      const result = parseStoreCreditHistory(parsed.rows, file.path)
      storeCreditEntries.push(...result.entries)
      fileWarnings.push(...result.warnings)
      bucket.storeCreditEntryIds.push(...result.entries.map((item) => item.id))
      summaries.push(buildSummary(file.path, detected.type, parsed.rows.length, result.entries.length, result.skippedCount, result.warnings.length))
    } else if (detected.type === 'billing_projection' || detected.type === 'apple_pay_billings') {
      const result = parsePaymentEvidence(parsed.rows, file.path, detected.type)
      paymentEvidence.push(...result.evidence)
      fileWarnings.push(...result.warnings)
      bucket.paymentEvidenceIds.push(...result.evidence.map((item) => item.id))
      summaries.push(buildSummary(file.path, detected.type, parsed.rows.length, result.evidence.length, result.skippedCount, result.warnings.length))
    } else if (detected.type === 'applecare_repairs') {
      const result = parseAppleCareRepairs(parsed.rows, file.path)
      repairEvents.push(...result.repairEvents)
      fileWarnings.push(...result.warnings)
      bucket.repairEventIds.push(...result.repairEvents.map((item) => item.id))
      summaries.push(buildSummary(file.path, detected.type, parsed.rows.length, result.repairEvents.length, result.skippedCount, result.warnings.length))
    } else if (detected.type === 'applecare_cases') {
      const result = parseAppleCareCases(parsed.rows, file.path)
      supportCases.push(...result.supportCases)
      fileWarnings.push(...result.warnings)
      bucket.supportCaseIds.push(...result.supportCases.map((item) => item.id))
      summaries.push(buildSummary(file.path, detected.type, parsed.rows.length, result.supportCases.length, result.skippedCount, result.warnings.length))
    } else if (detected.type === 'apple_id_device_information') {
      const result = parseAppleIdDeviceInformation(parsed.rows, file.path)
      deviceAppearances.push(...result.appearances)
      fileWarnings.push(...result.warnings)
      bucket.deviceAppearanceIds.push(...result.appearances.map((item) => item.id))
      summaries.push(buildSummary(file.path, detected.type, parsed.rows.length, result.appearances.length, result.skippedCount, result.warnings.length))
    } else {
      const issue = createImportIssue('missing_required_field', 'info', file.path, '文件未识别，已跳过。', bucket)
      fileIssues.push(issue)
      warnings.push({ level: 'warning', message: '文件未识别，已跳过。', filePath: file.path })
      summaries.push({
        path: file.path,
        type: fileTypeLabel('unknown'),
        rowCount: parsed.rows.length,
        parsedCount: 0,
        skippedCount: parsed.rows.length,
        status: 'unknown',
        warningCount: 1,
      })
    }

    warnings.push(...fileWarnings)
    dataQualityIssues.push(...fileIssues)
    bucket.issueIds.push(...fileIssues.map((item) => item.id))
    fileBuckets.push(bucket)
  }

  return {
    transactions,
    assets,
    subscriptions,
    subscriptionEvents,
    storeCreditEntries,
    deviceLifecycles: dedupeLifecycles(deviceLifecycles),
    repairEvents,
    supportCases,
    deviceAppearances,
    paymentEvidence,
    dataQualityIssues,
    batch: {
      id: createRuntimeId('batch'),
      importedAt: new Date().toISOString(),
      sourceName: files.some((file) => file.name.toLowerCase().endsWith('.zip')) ? 'Apple ZIP / CSV 导入' : 'Apple CSV 导入',
      files: summaries,
      parserVersion: 'v2',
      warnings,
    },
    fileBuckets,
  }
}

function createEmptyBucket(path: string): ImportedFileBucket {
  return {
    path,
    transactionIds: [],
    assetIds: [],
    subscriptionIds: [],
    subscriptionEventIds: [],
    storeCreditEntryIds: [],
    deviceLifecycleIds: [],
    repairEventIds: [],
    supportCaseIds: [],
    deviceAppearanceIds: [],
    paymentEvidenceIds: [],
    issueIds: [],
  }
}

function buildSummary(
  path: string,
  type: AppleCsvFileType,
  rowCount: number,
  parsedCount: number,
  skippedCount: number,
  warningCount: number,
): ImportedFileSummary {
  return {
    path,
    type: fileTypeLabel(type),
    rowCount,
    parsedCount,
    skippedCount,
    status: warningCount ? 'warning' : 'success',
    warningCount,
  }
}

function createImportIssue(
  type: DataQualityIssue['type'],
  severity: DataQualityIssue['severity'],
  path: string,
  description: string,
  bucket: ImportedFileBucket,
): DataQualityIssue {
  const id = createId('issue', [type, path, description])
  bucket.issueIds.push(id)
  return {
    id,
    severity,
    type,
    title: path.split(':').slice(-1)[0] || path,
    description,
    entityType: 'import_file',
    entityIds: [path],
  }
}

function createLifecycleFromAsset(asset: AppleAsset): AppleDeviceLifecycle {
  return {
    assetId: asset.id,
    deviceName: asset.name,
    status: asset.status,
    repairEventIds: [],
    supportCaseIds: [],
  }
}

function dedupeLifecycles(entries: AppleDeviceLifecycle[]): AppleDeviceLifecycle[] {
  const map = new Map(entries.map((item) => [item.assetId, item]))
  return Array.from(map.values())
}
