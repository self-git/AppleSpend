import Decimal from 'decimal.js'

export function parseMoney(value: string | number | null | undefined): Decimal {
  if (value === null || value === undefined) return new Decimal(0)
  const cleaned = String(value)
    .replace(/[,\s¥$￥]/g, '')
    .replace(/[()]/g, '')
    .trim()
  if (!cleaned || cleaned === '-') return new Decimal(0)
  const decimal = new Decimal(cleaned)
  return String(value).includes('(') && String(value).includes(')') ? decimal.negated() : decimal
}

export function multiplyMoney(value: string | number | null | undefined, qty: string | number | null | undefined): Decimal {
  return parseMoney(value).times(parseMoney(qty || 1))
}

export function formatMoney(value: Decimal.Value, currency = 'CNY'): string {
  const decimal = new Decimal(value)
  const sign = decimal.isNegative() ? '-' : ''
  const symbol = currency.toUpperCase() === 'CNY' || currency === '人民币' ? '¥' : `${currency} `
  const [integer = '0', fraction = '00'] = decimal.abs().toFixed(2).split('.')
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}${symbol}${grouped}.${fraction}`
}

export function sumDecimals(values: Decimal.Value[]): Decimal {
  return values.reduce<Decimal>((total, value) => total.plus(value), new Decimal(0))
}
