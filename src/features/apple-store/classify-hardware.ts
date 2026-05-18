import type { AppleAssetCategory } from '@/features/transactions/transaction-model'

export function classifyHardware(description: string): AppleAssetCategory {
  const value = description.toUpperCase()
  if (isAccessory(value)) return 'Accessory'
  if (value.includes('IPHONE')) return 'iPhone'
  if (value.includes('IPAD')) return 'iPad'
  if (value.includes('AIRPODS')) return 'AirPods'
  if (value.includes('WATCH')) return 'Apple Watch'
  if (value.includes('APPLECARE') || value.includes('AC+')) return 'AppleCare'
  if (
    value.includes('MAC') ||
    value.includes('MBA') ||
    value.includes('MBP') ||
    value.includes('MACBOOK') ||
    value.includes('IMAC') ||
    value.includes('MAC MINI') ||
    value.includes('MAC STUDIO') ||
    value.includes('STUDIO DISPLAY')
  ) {
    return 'Mac'
  }
  if (value.includes('FINAL CUT') || value.includes('LOGIC PRO')) return 'Software'
  return 'Other'
}

function isAccessory(value: string): boolean {
  return [
    'CASE',
    'COVER',
    'SLEEVE',
    'FOLIO',
    'BAND',
    'STRAP',
    'CABLE',
    'ADAPTER',
    'CHARGER',
    'POWER ADAPTER',
    'MAGSAFE',
    'HOMEPOD',
    'SPEAKER',
    'APPLE PENCIL',
    'PENCIL',
    'KEYBOARD',
    'MOUSE',
    'TRACKPAD',
    'REMOTE',
    'DOCK',
    'CONNECTOR',
    'AIRTAG',
  ].some((keyword) => value.includes(keyword))
}
