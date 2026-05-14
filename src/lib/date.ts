import dayjs from 'dayjs'

const knownFormats = ['YYYY-MM-DD', 'MM/DD/YYYY', 'M/D/YYYY', 'YYYY/MM/DD', 'DD/MM/YYYY']

export function normalizeDate(value: string | undefined): string {
  if (!value) return ''
  const trimmed = value.trim()
  for (const format of knownFormats) {
    const parsed = dayjs(trimmed, format)
    if (parsed.isValid()) return parsed.format('YYYY-MM-DD')
  }
  const parsed = dayjs(trimmed)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : trimmed
}

export function getYear(value: string): string {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY') : '未知'
}

export function humanDurationSince(value: string): string {
  const start = dayjs(value)
  if (!start.isValid()) return '未知'
  const months = Math.max(dayjs().diff(start, 'month'), 0)
  if (months < 1) return '不到 1 个月'
  if (months < 12) return `${months} 个月`
  const years = Math.floor(months / 12)
  const rest = months % 12
  return rest ? `${years} 年 ${rest} 个月` : `${years} 年`
}
