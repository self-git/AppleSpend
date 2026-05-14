export function createId(prefix: string, parts: Array<string | number | undefined | null>): string {
  const source = parts.map((part) => String(part ?? '')).join('|')
  let hash = 0
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index)
    hash |= 0
  }
  return `${prefix}_${Math.abs(hash).toString(36)}`
}

export function createRuntimeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
