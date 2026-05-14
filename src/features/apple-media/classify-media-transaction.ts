export function normalizePaymentType(value: string | undefined): string {
  return String(value ?? '').trim() || 'Unknown'
}

export function isCashPayment(paymentType: string): boolean {
  const value = paymentType.toUpperCase()
  if (!value || value === 'UNKNOWN') return false
  if (value.includes('STORE CREDIT')) return false
  if (value.includes('NONE')) return false
  return true
}

export function isStoreCredit(paymentType: string): boolean {
  return paymentType.toUpperCase().includes('STORE CREDIT')
}

export function mediaCategory(contentType: string, description: string): string {
  const type = contentType.trim() || 'Media'
  const text = `${type} ${description}`.toUpperCase()
  if (text.includes('SUBSCRIPTION') || text.includes('ICLOUD') || text.includes('APPLE MUSIC')) return 'Subscription'
  if (text.includes('IN-APP')) return 'In-App Purchase'
  if (text.includes('GIFT')) return 'Store Credit'
  if (text.includes('APP')) return 'App'
  return type
}
