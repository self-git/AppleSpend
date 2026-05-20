export function categoryLabel(category: string | undefined): string {
  const labels: Record<string, string> = {
    'In-App Purchase': 'App 内购买项目',
    Subscription: '订阅',
    'Store Credit': '余额',
    App: 'App',
    Media: '媒体',
    Unknown: '未知',
  }
  return labels[String(category ?? '')] ?? String(category ?? '未知')
}

export function paymentMethodLabel(paymentMethod: string | undefined): string {
  const value = String(paymentMethod ?? '').trim()
  if (!value) return '未知'
  return value.toUpperCase().includes('STORE CREDIT') ? '余额' : value
}

export function sourceLabel(source: string | undefined): string {
  const labels: Record<string, string> = {
    apple_store: 'Apple Store',
    app_store: 'App Store',
    subscription: '订阅',
    store_credit: '余额',
    applecare: 'AppleCare',
    external_retail: '外部平台',
    media_transactions: '媒体交易',
    store_credit_history: '余额历史',
    manual: '手动',
  }
  return labels[String(source ?? '')] ?? String(source ?? '未知')
}

export function storeCreditDirectionLabel(direction: string | undefined): string {
  const labels: Record<string, string> = {
    recharge: '充值',
    spend: '消费',
    refund: '退款',
    adjustment: '调整',
    unknown: '未知',
  }
  return labels[String(direction ?? '')] ?? String(direction ?? '未知')
}
