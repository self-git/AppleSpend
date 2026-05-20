import type { ImportedFileBucket } from '@/features/import/import-store'
import type { ImportDataPayload } from '@/features/transactions/transaction-store'
import type { AppleAsset, AppleDeviceLifecycle, AppleTransaction, DataQualityIssue, ImportedFileSummary } from '@/features/transactions/transaction-model'
import { createId, createRuntimeId } from '@/lib/id'
import type { ExternalRetailImportDraft } from './external-retail-model'

export function createExternalRetailImportPayload(drafts: ExternalRetailImportDraft[]): {
  payload: ImportDataPayload
  fileBuckets: ImportedFileBucket[]
} {
  const transactions: AppleTransaction[] = []
  const assets: AppleAsset[] = []
  const deviceLifecycles: AppleDeviceLifecycle[] = []
  const dataQualityIssues: DataQualityIssue[] = []
  const files: ImportedFileSummary[] = []
  const fileBuckets: ImportedFileBucket[] = []

  drafts.forEach((draft) => {
    const transaction = draftToTransaction(draft)
    const asset = draftToAsset(draft, transaction.id)
    const lifecycle = draftToLifecycle(asset)
    const bucket = createBucket(draft.sourceFileName)

    transactions.push(transaction)
    assets.push(asset)
    deviceLifecycles.push(lifecycle)
    bucket.transactionIds.push(transaction.id)
    bucket.assetIds.push(asset.id)
    bucket.deviceLifecycleIds.push(asset.id)

    if (draft.warnings.length) {
      const issue = createId('issue', ['external_retail_draft', draft.id])
      dataQualityIssues.push({
        id: issue,
        severity: 'warning',
        type: 'missing_required_field',
        title: draft.productName,
        description: draft.warnings.join(' '),
        entityType: 'externalRetailDraft',
        entityIds: [draft.id],
        suggestedAction: '检查导入预览中的字段，必要时手动修正后再导入。',
      })
      bucket.issueIds.push(issue)
    }

    files.push({
      path: draft.sourceFileName,
      type: '外部平台电子发票 PDF',
      rowCount: 1,
      parsedCount: 2,
      skippedCount: 0,
      status: draft.warnings.length ? 'warning' : 'success',
      warningCount: draft.warnings.length,
    })
    fileBuckets.push(bucket)
  })

  return {
    payload: {
      transactions,
      assets,
      subscriptions: [],
      subscriptionEvents: [],
      storeCreditEntries: [],
      deviceLifecycles,
      repairEvents: [],
      supportCases: [],
      deviceAppearances: [],
      paymentEvidence: [],
      dataQualityIssues,
      batch: {
        id: createRuntimeId('batch'),
        importedAt: new Date().toISOString(),
        sourceName: '外部平台电子发票导入',
        files,
        parserVersion: 'external-retail-invoice-v1',
        warnings: dataQualityIssues.map((issue) => ({
          level: issue.severity,
          message: issue.description,
          filePath: issue.entityIds?.[0],
        })),
      },
    },
    fileBuckets,
  }
}

function draftToTransaction(draft: ExternalRetailImportDraft): AppleTransaction {
  const id = createId('external-retail', [
    draft.deviceFingerprint,
    draft.invoiceNumber,
    draft.orderNumber,
    draft.productName,
    draft.cashAmount,
    draft.invoiceDate,
  ])

  return {
    id,
    source: 'external_retail',
    date: draft.invoiceDate || '',
    title: draft.productName,
    subtitle: [platformLabel(draft.platform), draft.sellerName].filter(Boolean).join(' · '),
    category: draft.category,
    amount: draft.cashAmount || '0.00',
    billValueAmount: draft.billValueAmount,
    currency: draft.currency,
    paymentMethod: platformLabel(draft.platform),
    orderNumber: draft.orderNumber || draft.invoiceNumber,
    platform: draft.platform,
    sellerName: draft.sellerName,
    invoiceNumber: draft.invoiceNumber,
    rawType: 'External Retail Invoice',
    cashImpact: Boolean(draft.cashAmount),
    billValueImpact: Boolean(draft.billValueAmount || draft.cashAmount),
    isFree: !draft.cashAmount || draft.cashAmount === '0.00',
    isRefund: false,
    duplicateGroupKey: createDuplicateKey(draft),
    raw: {
      sourceFileName: draft.sourceFileName,
      platform: draft.platform,
      sellerName: draft.sellerName ?? '',
      invoiceCode: draft.invoiceCode ?? '',
      invoiceNumber: draft.invoiceNumber ?? '',
      invoiceDate: draft.invoiceDate ?? '',
      orderNumber: draft.orderNumber ?? '',
      modelCode: draft.modelCode ?? '',
      quantity: String(draft.quantity ?? ''),
      cashAmount: draft.cashAmount ?? '',
      billValueAmount: draft.billValueAmount ?? '',
      subsidyAmount: draft.subsidyAmount ?? '',
      deviceFingerprint: draft.deviceFingerprint ?? '',
      snFingerprint: draft.snFingerprint ?? '',
      imeiFingerprints: draft.imeiFingerprints.join(','),
    },
  }
}

function draftToAsset(draft: ExternalRetailImportDraft, sourceTransactionId: string): AppleAsset {
  return {
    id: createId('asset', [sourceTransactionId, draft.deviceFingerprint, draft.productName]),
    name: draft.productName,
    category: draft.category,
    purchaseDate: draft.invoiceDate || '',
    purchasePrice: draft.cashAmount || '0.00',
    billValueAmount: draft.billValueAmount,
    currency: draft.currency,
    orderNumber: draft.orderNumber || draft.invoiceNumber || '',
    sourceTransactionId,
    platform: draft.platform,
    sellerName: draft.sellerName,
    invoiceNumber: draft.invoiceNumber,
    deviceFingerprint: draft.deviceFingerprint,
    snFingerprint: draft.snFingerprint,
    imeiFingerprints: draft.imeiFingerprints,
    fingerprintAlgorithm: draft.fingerprintAlgorithm,
    fingerprintSources: draft.fingerprintSources,
    status: 'unknown',
    note: [platformLabel(draft.platform), draft.sellerName, draft.modelCode].filter(Boolean).join(' · '),
  }
}

function draftToLifecycle(asset: AppleAsset): AppleDeviceLifecycle {
  return {
    assetId: asset.id,
    deviceName: asset.name,
    status: asset.status,
    repairEventIds: [],
    supportCaseIds: [],
    note: asset.deviceFingerprint ? `设备识别短码：${asset.deviceFingerprint}` : undefined,
  }
}

function createBucket(path: string): ImportedFileBucket {
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

function createDuplicateKey(draft: ExternalRetailImportDraft): string {
  return [
    draft.deviceFingerprint,
    draft.platform,
    draft.orderNumber,
    draft.invoiceNumber,
    draft.productName,
    draft.cashAmount,
    draft.invoiceDate,
  ].join('|')
}

export function platformLabel(value: string | undefined): string {
  const labels: Record<string, string> = {
    jd: '京东',
    tmall: '天猫',
    taobao: '淘宝',
    apple_store: 'Apple Store',
    other: '外部平台',
  }
  return labels[String(value ?? '')] ?? '外部平台'
}
