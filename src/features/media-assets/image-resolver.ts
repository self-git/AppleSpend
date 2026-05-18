import type { AppleAsset, AppleTransaction } from '@/features/transactions/transaction-model'
import type { AppleVisualAsset } from './asset-image-model'
import { resolvePreciseAppleHardwareImage } from './apple-hardware-catalog'
import { visualAssets } from './image-manifest'

const fallback = visualAssets.find((item) => item.id === 'placeholder-default')!

export function resolveTransactionImage(transaction: AppleTransaction): AppleVisualAsset {
  if (transaction.imageUrl || transaction.thumbnailUrl) {
    return {
      id: transaction.imageId ?? transaction.id,
      kind: transaction.source === 'apple_store' ? 'hardware' : 'software',
      category: transaction.category,
      matchKeywords: [],
      thumbnail: transaction.thumbnailUrl ?? transaction.imageUrl ?? fallback.thumbnail,
      image: transaction.imageUrl ?? transaction.thumbnailUrl ?? fallback.image,
      source: 'transaction',
    }
  }

  return resolveByText({
    imageId: transaction.imageId,
    category: transaction.category,
    text: `${transaction.category} ${transaction.title} ${transaction.subtitle ?? ''} ${transaction.rawType ?? ''}`,
    preferredKind: transaction.source === 'apple_store' ? 'hardware' : 'software',
  })
}

export function resolveTransactionHeroImage(transaction: AppleTransaction): AppleVisualAsset {
  return resolvePreciseAppleHardwareImage(transaction)?.asset ?? resolveTransactionImage(transaction)
}

export function resolveAssetImage(asset: AppleAsset): AppleVisualAsset {
  if (asset.imageUrl || asset.thumbnailUrl) {
    return {
      id: asset.imageId ?? asset.id,
      kind: 'hardware',
      category: asset.category,
      matchKeywords: [],
      thumbnail: asset.thumbnailUrl ?? asset.imageUrl ?? fallback.thumbnail,
      image: asset.imageUrl ?? asset.thumbnailUrl ?? fallback.image,
      source: 'asset',
    }
  }

  return resolveByText({
    imageId: asset.imageId,
    category: asset.category,
    text: `${asset.category} ${asset.name}`,
    preferredKind: asset.category === 'Software' ? 'software' : 'hardware',
  })
}

function resolveByText(input: {
  imageId?: string
  category?: string
  text: string
  preferredKind: AppleVisualAsset['kind']
}): AppleVisualAsset {
  if (input.imageId) {
    const manual = visualAssets.find((item) => item.id === input.imageId)
    if (manual) return manual
  }

  const normalizedText = input.text.toUpperCase()
  const keywordMatch = visualAssets
    .filter((item) => item.kind === input.preferredKind && item.matchKeywords.length > 0)
    .map((item) => {
      const matches = item.matchKeywords.filter((keyword) => normalizedText.includes(keyword.toUpperCase()))
      if (matches.length === 0) return undefined

      return {
        item,
        specificity: Math.max(...matches.map((keyword) => keyword.length)),
      }
    })
    .filter((item): item is { item: AppleVisualAsset; specificity: number } => Boolean(item))
    .sort((left, right) => right.specificity - left.specificity)[0]?.item
  if (keywordMatch) return keywordMatch

  const directCategory = visualAssets.find(
    (item) =>
      item.category === input.category &&
      item.kind === input.preferredKind &&
      item.id.endsWith('-default'),
  )
  if (directCategory) return directCategory

  const kindDefault = visualAssets.find((item) => item.kind === input.preferredKind)
  return kindDefault ?? fallback
}
