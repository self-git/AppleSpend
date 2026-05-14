import type { AppleAssetCategory } from '@/features/transactions/transaction-model'

export function classifyHardware(description: string): AppleAssetCategory {
  const value = description.toUpperCase()
  if (value.includes('IPHONE')) return 'iPhone'
  if (value.includes('IPAD')) return 'iPad'
  if (value.includes('AIRPODS')) return 'AirPods'
  if (value.includes('WATCH')) return 'Apple Watch'
  if (value.includes('APPLECARE') || value.includes('AC+')) return 'AppleCare'
  if (value.includes('MAC') || value.includes('MBA') || value.includes('MBP') || value.includes('MACBOOK')) return 'Mac'
  if (value.includes('FINAL CUT') || value.includes('LOGIC PRO')) return 'Software'
  return value.includes('ADAPTER') || value.includes('CABLE') || value.includes('CASE') ? 'Accessory' : 'Other'
}
