import type { AppleAssetCategory, AppleRetailPlatform, DeviceFingerprintSource } from '@/features/transactions/transaction-model'

export interface ExternalRetailImportDraft {
  id: string
  sourceFileName: string
  platform: AppleRetailPlatform
  sellerName?: string
  invoiceCode?: string
  invoiceNumber?: string
  invoiceDate?: string
  orderNumber?: string
  productName: string
  modelCode?: string
  quantity?: number
  cashAmount?: string
  billValueAmount?: string
  subsidyAmount?: string
  currency: 'CNY'
  category: AppleAssetCategory
  deviceFingerprint?: string
  snFingerprint?: string
  imeiFingerprints: string[]
  fingerprintAlgorithm?: 'hmac-sha256-v1'
  fingerprintSources: DeviceFingerprintSource[]
  redactedText?: string
  confidence: 'high' | 'medium' | 'low'
  warnings: string[]
}

export interface ExternalRetailParseResult {
  draft?: ExternalRetailImportDraft
  text: string
  warnings: string[]
}
