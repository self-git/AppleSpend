export interface AppleVisualAsset {
  id: string
  kind: 'hardware' | 'software' | 'placeholder'
  category?: string
  matchKeywords: string[]
  thumbnail: string
  image: string
  source?: string
}
