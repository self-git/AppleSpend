import type { AppleTransaction } from '@/features/transactions/transaction-model'
import type { AppleVisualAsset } from './asset-image-model'

type HardwareProductLine = 'iPhone' | 'iPad' | 'Mac' | 'Apple Watch' | 'AirPods' | 'Accessory' | 'AppleCare'
type MatchConfidence = 'exact' | 'strong' | 'weak' | 'none'

interface ParsedAppleHardwareTitle {
  productLine?: HardwareProductLine
  model?: string
  color?: string
  capacity?: string
  region?: string
  tokens: string[]
  normalizedText: string
}

interface AppleHardwareCatalogItem {
  id: string
  productLine: HardwareProductLine
  model: string
  modelAliases: string[]
  color?: string
  colorAliases?: string[]
  capacityAliases?: string[]
  regionAliases?: string[]
  configKeywords?: string[]
  image: Pick<AppleVisualAsset, 'thumbnail' | 'image'>
}

export interface AppleHardwareImageMatch {
  asset: AppleVisualAsset
  confidence: MatchConfidence
  parsed: ParsedAppleHardwareTitle
}

const appleHardwareCatalog: AppleHardwareCatalogItem[] = [
  {
    id: 'iphone-11-white',
    productLine: 'iPhone',
    model: 'iPhone 11',
    modelAliases: ['IPHONE 11'],
    color: 'White',
    colorAliases: ['WHITE'],
    capacityAliases: ['64GB', '128GB', '256GB'],
    regionAliases: ['CHN', 'CH/A'],
    image: {
      thumbnail:
        'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone11-white-select-2019?wid=360&hei=360&fmt=png-alpha&qlt=80&.v=1566956148115',
      image:
        'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone11-white-select-2019?wid=940&hei=1112&fmt=png-alpha&qlt=80&.v=1566956148115',
    },
  },
  {
    id: 'macbook-air-13-space-gray',
    productLine: 'Mac',
    model: 'MacBook Air 13-inch',
    modelAliases: ['MBA 13.3', 'MACBOOK AIR 13.3', 'MACBOOK AIR'],
    color: 'Space Gray',
    colorAliases: ['SPG', 'SPACE GRAY', 'SPACE GREY'],
    configKeywords: ['8C CPU', '7C GPU'],
    image: {
      thumbnail:
        'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/macbook-air-space-gray-select-201810?wid=360&hei=360&fmt=jpeg&qlt=90',
      image:
        'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/macbook-air-space-gray-select-201810?wid=1000&hei=1000&fmt=jpeg&qlt=90',
    },
  },
]

const colorAliases: Array<{ color: string; aliases: string[] }> = [
  { color: 'White', aliases: ['WHITE'] },
  { color: 'Black', aliases: ['BLACK'] },
  { color: 'Green', aliases: ['GREEN'] },
  { color: 'Purple', aliases: ['PURPLE'] },
  { color: 'Yellow', aliases: ['YELLOW'] },
  { color: 'PRODUCT(RED)', aliases: ['PRODUCTRED', 'RED'] },
  { color: 'Space Gray', aliases: ['SPG', 'SPACE GRAY', 'SPACE GREY'] },
  { color: 'Silver', aliases: ['SLV', 'SILVER'] },
  { color: 'Gold', aliases: ['GLD', 'GOLD'] },
  { color: 'Midnight', aliases: ['MIDNIGHT'] },
  { color: 'Starlight', aliases: ['STARLIGHT'] },
]

export function resolvePreciseAppleHardwareImage(transaction: AppleTransaction): AppleHardwareImageMatch | undefined {
  if (transaction.source !== 'apple_store') return undefined

  const parsed = parseAppleHardwareTitle(buildHardwareSearchText(transaction))
  if (!parsed.productLine) return undefined

  const match = appleHardwareCatalog
    .map((item) => ({ item, confidence: scoreCatalogItem(item, parsed) }))
    .find((candidate) => isDisplayableConfidence(candidate.confidence))

  if (!match) return undefined

  return {
    confidence: match.confidence,
    parsed,
    asset: {
      id: `apple-official-${match.item.id}`,
      kind: 'hardware',
      category: match.item.productLine,
      matchKeywords: match.item.modelAliases,
      thumbnail: match.item.image.thumbnail,
      image: match.item.image.image,
      source: 'apple-official',
    },
  }
}

export function parseAppleHardwareTitle(input: string): ParsedAppleHardwareTitle {
  const normalizedText = normalizeHardwareText(input)
  const tokens = normalizedText.split(' ').filter(Boolean)

  return {
    productLine: parseProductLine(normalizedText),
    model: parseModel(normalizedText),
    color: parseColor(normalizedText),
    capacity: normalizedText.match(/\b\d+(?:GB|TB)\b/)?.[0],
    region: parseRegion(normalizedText),
    tokens,
    normalizedText,
  }
}

function buildHardwareSearchText(transaction: AppleTransaction): string {
  return [
    transaction.category,
    transaction.title,
    transaction.subtitle,
    transaction.rawType,
    transaction.orderNumber,
    transaction.raw.Description,
    transaction.raw['Product Name'],
  ]
    .filter(Boolean)
    .join(' ')
}

function scoreCatalogItem(item: AppleHardwareCatalogItem, parsed: ParsedAppleHardwareTitle): MatchConfidence {
  if (parsed.productLine !== item.productLine) return 'none'
  if (!containsAnyPhrase(parsed.normalizedText, item.modelAliases)) return 'none'

  const colorMatches = !item.colorAliases?.length || containsAnyPhrase(parsed.normalizedText, item.colorAliases)
  const configMatches = !item.configKeywords?.length || item.configKeywords.every((keyword) => containsPhrase(parsed.normalizedText, keyword))

  if (colorMatches && configMatches) return 'exact'

  const capacityMatches = !item.capacityAliases?.length || !parsed.capacity || item.capacityAliases.includes(parsed.capacity)
  const regionMatches = !item.regionAliases?.length || !parsed.region || item.regionAliases.includes(parsed.region)

  if (capacityMatches && regionMatches && configMatches && !item.colorAliases?.length) return 'strong'

  return 'weak'
}

function isDisplayableConfidence(confidence: MatchConfidence): boolean {
  return confidence === 'exact' || confidence === 'strong'
}

function parseProductLine(text: string): HardwareProductLine | undefined {
  if (containsPhrase(text, 'IPHONE')) return 'iPhone'
  if (containsPhrase(text, 'IPAD')) return 'iPad'
  if (containsPhrase(text, 'AIRPODS')) return 'AirPods'
  if (containsPhrase(text, 'WATCH')) return 'Apple Watch'
  if (containsPhrase(text, 'APPLECARE') || containsPhrase(text, 'AC+')) return 'AppleCare'
  if (containsAnyPhrase(text, ['MACBOOK', 'MAC', 'MBA', 'MBP', 'IMAC', 'MAC MINI', 'MAC STUDIO', 'STUDIO DISPLAY'])) {
    return 'Mac'
  }
  if (
    containsAnyPhrase(text, [
      'ADAPTER',
      'CABLE',
      'CASE',
      'MAGSAFE',
      'PENCIL',
      'KEYBOARD',
      'MOUSE',
      'TRACKPAD',
      'REMOTE',
      'HOMEPOD',
      'SPEAKER',
      'AIRTAG',
    ])
  ) {
    return 'Accessory'
  }
  return undefined
}

function parseModel(text: string): string | undefined {
  const iphoneMatch = text.match(/\bIPHONE\s+(SE|\d{1,2}(?:\s+(?:MINI|PLUS|PRO|PRO MAX))?)\b/)
  if (iphoneMatch?.[1]) return `iPhone ${iphoneMatch[1].replace(/\s+/g, ' ')}`

  if (containsAnyPhrase(text, ['MBA', 'MACBOOK AIR'])) {
    const size = text.match(/\b(11|12|13|13\.3|14|15|16)\b/)?.[1]
    return size ? `MacBook Air ${size}-inch` : 'MacBook Air'
  }

  if (containsAnyPhrase(text, ['MBP', 'MACBOOK PRO'])) {
    const size = text.match(/\b(13|14|15|16)\b/)?.[1]
    return size ? `MacBook Pro ${size}-inch` : 'MacBook Pro'
  }

  return undefined
}

function parseColor(text: string): string | undefined {
  return colorAliases.find((item) => containsAnyPhrase(text, item.aliases))?.color
}

function parseRegion(text: string): string | undefined {
  if (containsAnyPhrase(text, ['CHN', 'CH/A'])) return 'CHN'
  if (containsPhrase(text, 'ZP/A')) return 'ZP/A'
  if (containsPhrase(text, 'LL/A')) return 'LL/A'
  return undefined
}

function normalizeHardwareText(input: string): string {
  return input
    .normalize('NFKC')
    .toUpperCase()
    .replace(/([A-Z])\/([A-Z])/g, '$1/$2')
    .replace(/[^A-Z0-9+/.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function containsAnyPhrase(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => containsPhrase(text, phrase))
}

function containsPhrase(text: string, phrase: string): boolean {
  const normalizedPhrase = normalizeHardwareText(phrase)
  return new RegExp(`(^|[\\s/])${escapeRegExp(normalizedPhrase)}($|[\\s/])`).test(text)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
