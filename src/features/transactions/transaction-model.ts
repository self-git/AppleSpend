export type AppleTransactionSource = 'apple_store' | 'app_store' | 'subscription' | 'store_credit' | 'applecare' | 'external_retail'

export type AppleRetailPlatform = 'jd' | 'tmall' | 'taobao' | 'apple_store' | 'other'

export type DeviceFingerprintSource = 'invoice_sn' | 'invoice_imei1' | 'invoice_imei2'

export type AppleAssetCategory =
  | 'iPhone'
  | 'iPad'
  | 'Mac'
  | 'Apple Watch'
  | 'AirPods'
  | 'AppleCare'
  | 'Accessory'
  | 'Software'
  | 'Other'

export interface AppleTransaction {
  id: string
  source: AppleTransactionSource
  date: string
  title: string
  subtitle?: string
  category: string
  amount: string
  billValueAmount?: string
  currency: string
  paymentMethod?: string
  orderNumber?: string
  platform?: AppleRetailPlatform
  sellerName?: string
  invoiceNumber?: string
  rawType?: string
  cashImpact: boolean
  billValueImpact: boolean
  isFree: boolean
  isRefund: boolean
  duplicateGroupKey?: string
  imageId?: string
  imageUrl?: string
  thumbnailUrl?: string
  raw: Record<string, string>
}

export interface AppleAsset {
  id: string
  name: string
  category: AppleAssetCategory
  purchaseDate: string
  purchasePrice: string
  billValueAmount?: string
  currency: string
  orderNumber: string
  sourceTransactionId: string
  platform?: AppleRetailPlatform
  sellerName?: string
  invoiceNumber?: string
  deviceFingerprint?: string
  snFingerprint?: string
  imeiFingerprints?: string[]
  fingerprintAlgorithm?: 'hmac-sha256-v1'
  fingerprintSources?: DeviceFingerprintSource[]
  status: 'using' | 'sold' | 'retired' | 'gifted' | 'lost' | 'unknown'
  imageId?: string
  imageUrl?: string
  thumbnailUrl?: string
  note?: string
}

export interface ImportBatch {
  id: string
  importedAt: string
  sourceName: string
  files: ImportedFileSummary[]
  parserVersion: string
  warnings: ImportWarning[]
}

export interface ImportedFileSummary {
  path: string
  type: string
  rowCount: number
  parsedCount: number
  skippedCount: number
  duplicateCount?: number
  insertedCount?: number
  status?: 'success' | 'warning' | 'unknown' | 'conflict'
  warningCount?: number
}

export interface ImportWarning {
  level: 'info' | 'warning' | 'error'
  message: string
  filePath?: string
  rowNumber?: number
}

export interface AppleRawRef {
  source: string
  filePath?: string
  recordId?: string
  type?: string
}

export interface AppleSubscription {
  id: string
  serviceName: string
  appName?: string
  productName?: string
  firstSeenDate?: string
  latestEventDate?: string
  status: 'active' | 'expired' | 'cancelled' | 'unknown'
  billingPeriod?: 'weekly' | 'monthly' | 'yearly' | 'one_time' | 'unknown'
  latestAmount?: string
  currency?: string
  sourceTransactionIds: string[]
  eventIds: string[]
  rawRefs: AppleRawRef[]
}

export interface AppleSubscriptionEvent {
  id: string
  subscriptionId: string
  date: string
  eventType: 'start' | 'renewal' | 'trial' | 'cancel' | 'expire' | 'refund' | 'unknown'
  amount?: string
  currency?: string
  orderNumber?: string
  raw: Record<string, string>
}

export interface StoreCreditEntry {
  id: string
  date: string
  direction: 'recharge' | 'spend' | 'refund' | 'adjustment' | 'unknown'
  amount: string
  currency: string
  source: 'media_transactions' | 'store_credit_history' | 'manual'
  relatedTransactionId?: string
  orderNumber?: string
  balanceAfter?: string
  raw: Record<string, string>
}

export interface AppleDeviceLifecycle {
  assetId: string
  deviceName?: string
  serialNumber?: string
  modelIdentifier?: string
  appleCareStatus?: 'covered' | 'expired' | 'none' | 'unknown'
  firstSeenDate?: string
  lastSeenDate?: string
  soldDate?: string
  soldPrice?: string
  status: 'using' | 'sold' | 'retired' | 'gifted' | 'lost' | 'unknown'
  isPrimaryDevice?: boolean
  repairEventIds: string[]
  supportCaseIds: string[]
  note?: string
}

export interface AppleCareRepairEvent {
  id: string
  date?: string
  deviceHint?: string
  issue?: string
  repairStatus?: string
  cost?: string
  currency?: string
  relatedAssetId?: string
  raw: Record<string, string>
}

export interface AppleSupportCase {
  id: string
  openedDate?: string
  closedDate?: string
  deviceHint?: string
  caseNumber?: string
  status?: string
  issue?: string
  relatedAssetId?: string
  raw: Record<string, string>
}

export interface AppleDeviceAppearance {
  id: string
  deviceName?: string
  modelIdentifier?: string
  serialNumber?: string
  platform?: string
  osVersion?: string
  firstSeenDate?: string
  lastSeenDate?: string
  relatedAssetId?: string
  raw: Record<string, string>
}

export interface PaymentEvidence {
  id: string
  date: string
  amount: string
  currency: string
  paymentMethod?: string
  orderNumber?: string
  relatedTransactionIds: string[]
  raw: Record<string, string>
}

export interface DataQualityIssue {
  id: string
  severity: 'info' | 'warning' | 'error'
  type:
    | 'duplicate_candidate'
    | 'missing_required_field'
    | 'unclassified_item'
    | 'ambiguous_file_type'
    | 'unlinked_store_credit'
    | 'unlinked_device_event'
    | 'amount_mismatch'
    | 'subscription_status_unknown'
    | 'orphan_device_appearance'
  title: string
  description: string
  entityType?: string
  entityIds?: string[]
  suggestedAction?: string
  dismissed?: boolean
}

export interface RuleSetting {
  id: string
  type: 'category' | 'cash_flow' | 'store_credit' | 'exclude' | 'subscription_alias' | 'device_alias'
  name: string
  enabled: boolean
  matcher: string
  value: string
  note?: string
  updatedAt: string
}
