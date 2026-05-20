import Decimal from 'decimal.js'
import type {
  AppleAsset,
  AppleCareRepairEvent,
  AppleDeviceAppearance,
  AppleDeviceLifecycle,
  AppleSupportCase,
  RuleSetting,
} from '@/features/transactions/transaction-model'
import { parseMoney } from '@/lib/money'
import { resolveDeviceDisplayName } from '@/features/rules/rule-helpers'

export interface AssetDetailViewModel {
  asset: AppleAsset
  lifecycle: AppleDeviceLifecycle
  repairEvents: AppleCareRepairEvent[]
  supportCases: AppleSupportCase[]
  appearances: AppleDeviceAppearance[]
  netCost: Decimal
  monthlyCost: Decimal
  dailyCost: Decimal
}

export function buildAssetDetails(
  assets: AppleAsset[],
  lifecycles: AppleDeviceLifecycle[],
  repairEvents: AppleCareRepairEvent[],
  supportCases: AppleSupportCase[],
  appearances: AppleDeviceAppearance[],
  ruleSettings: RuleSetting[],
): AssetDetailViewModel[] {
  return assets.map((asset) => {
    const lifecycle = lifecycles.find((item) => item.assetId === asset.id) ?? defaultLifecycle(asset)
    const normalizedName = resolveDeviceDisplayName(asset.name, ruleSettings).toUpperCase()
    const assetRepairs = repairEvents.filter((item) => isAssetMatch(item.relatedAssetId, asset.id) || includesDeviceHint(item.deviceHint, normalizedName))
    const assetCases = supportCases.filter((item) => isAssetMatch(item.relatedAssetId, asset.id) || includesDeviceHint(item.deviceHint, normalizedName))
    const assetAppearances = appearances.filter(
      (item) => isAssetMatch(item.relatedAssetId, asset.id) || includesDeviceHint(item.deviceName || item.modelIdentifier, normalizedName),
    )

    const netCost = parseMoney(asset.purchasePrice).minus(parseMoney(lifecycle.soldPrice))
    const elapsedDays = Math.max(
      1,
      Math.floor((Date.now() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24)) || 1,
    )

    return {
      asset: { ...asset, name: resolveDeviceDisplayName(asset.name, ruleSettings) },
      lifecycle,
      repairEvents: assetRepairs.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? ''))),
      supportCases: assetCases.sort((a, b) => String(b.openedDate ?? '').localeCompare(String(a.openedDate ?? ''))),
      appearances: assetAppearances.sort((a, b) => String(b.lastSeenDate ?? '').localeCompare(String(a.lastSeenDate ?? ''))),
      netCost,
      monthlyCost: netCost.div(Math.max(elapsedDays / 30.4, 1)),
      dailyCost: netCost.div(elapsedDays),
    }
  })
}

function defaultLifecycle(asset: AppleAsset): AppleDeviceLifecycle {
  return {
    assetId: asset.id,
    deviceName: asset.name,
    status: asset.status,
    repairEventIds: [],
    supportCaseIds: [],
    appleCareStatus: asset.category === 'AppleCare' ? 'covered' : 'unknown',
  }
}

function includesDeviceHint(candidate: string | undefined, normalizedName: string): boolean {
  const value = String(candidate ?? '').toUpperCase()
  if (!value) return false
  return value.includes(normalizedName) || normalizedName.includes(value)
}

function isAssetMatch(candidateAssetId: string | undefined, assetId: string): boolean {
  return candidateAssetId === assetId
}
