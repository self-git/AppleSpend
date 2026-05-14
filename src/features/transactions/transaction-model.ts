export type AppleTransactionSource = 'apple_store' | 'app_store' | 'subscription' | 'store_credit' | 'applecare'

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
  currency: string
  paymentMethod?: string
  orderNumber?: string
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
  currency: string
  orderNumber: string
  sourceTransactionId: string
  status: 'using' | 'sold' | 'retired' | 'gifted' | 'unknown'
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
}

export interface ImportWarning {
  level: 'info' | 'warning' | 'error'
  message: string
  filePath?: string
  rowNumber?: number
}
