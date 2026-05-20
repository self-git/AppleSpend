import type {
  AppleAsset,
  AppleCareRepairEvent,
  AppleDeviceAppearance,
  AppleDeviceLifecycle,
  AppleSubscription,
  AppleSupportCase,
  AppleTransaction,
  DataQualityIssue,
  PaymentEvidence,
  RuleSetting,
  StoreCreditEntry,
} from '@/features/transactions/transaction-model'
import { createId } from '@/lib/id'
import { parseMoney } from '@/lib/money'
import { calculateStoreCreditSummary } from '@/features/store-credit/store-credit-selectors'

export interface DataQualityInput {
  importedIssues?: DataQualityIssue[]
  transactions: AppleTransaction[]
  assets: AppleAsset[]
  subscriptions: AppleSubscription[]
  storeCreditEntries: StoreCreditEntry[]
  lifecycles: AppleDeviceLifecycle[]
  repairEvents: AppleCareRepairEvent[]
  supportCases: AppleSupportCase[]
  deviceAppearances: AppleDeviceAppearance[]
  paymentEvidence: PaymentEvidence[]
  ruleSettings: RuleSetting[]
  dismissedIds?: string[]
}

export function buildDataQualityIssues(input: DataQualityInput): DataQualityIssue[] {
  const issues = new Map<string, DataQualityIssue>()
  const dismissed = new Set(input.dismissedIds ?? [])
  const add = (issue: DataQualityIssue) => {
    issues.set(issue.id, { ...issue, dismissed: dismissed.has(issue.id) || issue.dismissed })
  }

  ;(input.importedIssues ?? []).forEach(add)

  input.assets
    .filter((asset) => asset.category === 'Other')
    .forEach((asset) =>
      add({
        id: createId('issue', ['unclassified_item', asset.id]),
        severity: 'warning',
        type: 'unclassified_item',
        title: asset.name,
        description: '硬件订单未能识别类别，当前被归入 Other。',
        entityType: 'asset',
        entityIds: [asset.id],
      }),
    )

  const storeCreditSummary = calculateStoreCreditSummary(input.transactions, input.storeCreditEntries, input.ruleSettings)
  storeCreditSummary.timeline
    .filter((entry) => entry.direction === 'spend' && !entry.linkedTransaction)
    .forEach((entry) =>
      add({
        id: createId('issue', ['unlinked_store_credit', entry.id]),
        severity: 'warning',
        type: 'unlinked_store_credit',
        title: '未关联的余额消费',
        description: `余额流水 ${entry.date} ${entry.amount} 未能关联到具体账单交易。`,
        entityType: 'storeCreditEntry',
        entityIds: [entry.id],
        suggestedAction: '检查订单号、日期和金额，必要时补充规则。',
      }),
    )

  input.subscriptions
    .filter((subscription) => subscription.status === 'unknown')
    .forEach((subscription) =>
      add({
        id: createId('issue', ['subscription_status_unknown', subscription.id]),
        severity: 'info',
        type: 'subscription_status_unknown',
        title: subscription.serviceName,
        description: '订阅状态无法可靠判断，当前保留为 unknown。',
        entityType: 'subscription',
        entityIds: [subscription.id],
      }),
    )

  collectDeviceEventIssues(input.assets, input.repairEvents, input.supportCases, input.deviceAppearances).forEach(add)
  collectAmountMismatchIssues(input.transactions, input.paymentEvidence).forEach(add)
  collectDuplicateAssetFingerprintIssues(input.assets).forEach(add)

  return Array.from(issues.values()).sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
}

function collectDuplicateAssetFingerprintIssues(assets: AppleAsset[]): DataQualityIssue[] {
  const groups = new Map<string, AppleAsset[]>()
  assets.forEach((asset) => {
    if (!asset.deviceFingerprint) return
    groups.set(asset.deviceFingerprint, [...(groups.get(asset.deviceFingerprint) ?? []), asset])
  })

  return Array.from(groups.entries())
    .filter(([, groupedAssets]) => groupedAssets.length > 1)
    .map(([fingerprint, groupedAssets]) => ({
      id: createId('issue', ['duplicate_asset_fingerprint', fingerprint]),
      severity: 'warning' as const,
      type: 'duplicate_candidate' as const,
      title: `疑似重复设备 ${fingerprint}`,
      description: `有 ${groupedAssets.length} 个资产使用同一设备识别短码，建议检查是否重复导入。`,
      entityType: 'asset',
      entityIds: groupedAssets.map((asset) => asset.id),
      suggestedAction: '保留一条资产记录，或确认它们是否来自同一台设备的多张凭证。',
    }))
}

function collectDeviceEventIssues(
  assets: AppleAsset[],
  repairEvents: AppleCareRepairEvent[],
  supportCases: AppleSupportCase[],
  appearances: AppleDeviceAppearance[],
): DataQualityIssue[] {
  const assetNames = assets.map((item) => item.name.toUpperCase())
  const issues: DataQualityIssue[] = []

  repairEvents
    .filter((item) => !item.relatedAssetId && !assetNames.some((name) => String(item.deviceHint ?? '').toUpperCase().includes(name)))
    .forEach((item) =>
      issues.push({
        id: createId('issue', ['repair', item.id]),
        severity: 'warning',
        type: 'unlinked_device_event',
        title: item.deviceHint || '未关联维修记录',
        description: '维修记录未能关联到资产卡片。',
        entityType: 'repairEvent',
        entityIds: [item.id],
      }),
    )

  supportCases
    .filter((item) => !item.relatedAssetId && !assetNames.some((name) => String(item.deviceHint ?? '').toUpperCase().includes(name)))
    .forEach((item) =>
      issues.push({
        id: createId('issue', ['case', item.id]),
        severity: 'info',
        type: 'unlinked_device_event',
        title: item.caseNumber || item.deviceHint || '未关联支持案例',
        description: '支持案例未能关联到资产卡片。',
        entityType: 'supportCase',
        entityIds: [item.id],
      }),
    )

  appearances
    .filter((item) => !item.relatedAssetId && !assetNames.some((name) => String(item.deviceName ?? '').toUpperCase().includes(name)))
    .forEach((item) =>
      issues.push({
        id: createId('issue', ['appearance', item.id]),
        severity: 'info',
        type: 'orphan_device_appearance',
        title: item.deviceName || item.modelIdentifier || '未关联设备出现记录',
        description: '设备信息出现在 Apple ID 记录中，但未能关联到购买资产。',
        entityType: 'deviceAppearance',
        entityIds: [item.id],
      }),
    )

  return issues
}

function collectAmountMismatchIssues(transactions: AppleTransaction[], paymentEvidence: PaymentEvidence[]): DataQualityIssue[] {
  return paymentEvidence.flatMap((evidence) => {
    const matches = transactions.filter((transaction) => {
      if (evidence.orderNumber && transaction.orderNumber) return evidence.orderNumber === transaction.orderNumber
      return evidence.date === transaction.date
    })

    return matches
      .filter((transaction) => parseMoney(transaction.amount).abs().minus(parseMoney(evidence.amount).abs()).abs().gt(0.01))
      .map((transaction) => ({
        id: createId('issue', ['amount_mismatch', evidence.id, transaction.id]),
        severity: 'warning' as const,
        type: 'amount_mismatch' as const,
        title: evidence.orderNumber || transaction.title,
        description: `支付凭证 ${evidence.amount} 与交易 ${transaction.amount} 不一致。`,
        entityType: 'paymentEvidence',
        entityIds: [evidence.id, transaction.id],
      }))
  })
}

function severityRank(value: DataQualityIssue['severity']): number {
  if (value === 'error') return 3
  if (value === 'warning') return 2
  return 1
}
