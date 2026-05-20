import type {
  AppleSubscription,
  AppleSubscriptionEvent,
  ImportWarning,
} from '@/features/transactions/transaction-model'
import type { CsvRow } from '@/lib/csv'
import { normalizeDate } from '@/lib/date'
import { createId } from '@/lib/id'
import { findRowValue } from '@/lib/row'

export interface SubscriptionHistoryParseResult {
  subscriptions: AppleSubscription[]
  events: AppleSubscriptionEvent[]
  skippedCount: number
  warnings: ImportWarning[]
}

export function parseSubscriptionHistory(rows: CsvRow[], filePath: string): SubscriptionHistoryParseResult {
  const warnings: ImportWarning[] = []
  const events: AppleSubscriptionEvent[] = []
  const subscriptions = new Map<string, AppleSubscription>()
  let skippedCount = 0

  rows.forEach((row, index) => {
    const serviceName =
      findRowValue(row, ['Subscription Name', 'Service Name', 'App Name', 'Name', 'Description']) ||
      findRowValue(row, ['Product Name'])
    const date = normalizeDate(findRowValue(row, ['Event Date', 'Date', 'Transaction Date', 'Start Date', 'Renewal Date']))

    if (!serviceName || !date) {
      skippedCount += 1
      warnings.push({ level: 'warning', message: '订阅历史记录缺少服务名或日期，已跳过。', filePath, rowNumber: index + 2 })
      return
    }

    const eventType = normalizeSubscriptionEventType(findRowValue(row, ['Event Type', 'Status', 'Action', 'Event']))
    const billingPeriod = normalizeBillingPeriod(findRowValue(row, ['Billing Period', 'Subscription Period', 'Cycle']))
    const amount = findRowValue(row, ['Amount', 'Price', 'Paid Amount', 'Transaction Amount']) || undefined
    const currency = findRowValue(row, ['Currency']) || 'CNY'
    const orderNumber = findRowValue(row, ['Order Number', 'Transaction ID', 'Original Transaction ID']) || undefined
    const normalizedServiceName = normalizeSubscriptionName(serviceName)
    const subscriptionId = createId('sub', [normalizedServiceName])
    const eventId = createId('subevt', [subscriptionId, date, eventType, amount, orderNumber, index])
    const event: AppleSubscriptionEvent = {
      id: eventId,
      subscriptionId,
      date,
      eventType,
      amount,
      currency,
      orderNumber,
      raw: row,
    }
    events.push(event)

    const existing = subscriptions.get(subscriptionId)
    const nextStatus = resolveSubscriptionStatus(eventType, findRowValue(row, ['Status']))
    if (!existing) {
      subscriptions.set(subscriptionId, {
        id: subscriptionId,
        serviceName,
        appName: findRowValue(row, ['App Name']) || undefined,
        productName: findRowValue(row, ['Product Name']) || undefined,
        firstSeenDate: date,
        latestEventDate: date,
        status: nextStatus,
        billingPeriod,
        latestAmount: amount,
        currency,
        sourceTransactionIds: [],
        eventIds: [eventId],
        rawRefs: [{ source: 'subscription_history', filePath, recordId: eventId, type: 'event' }],
      })
      return
    }

    existing.firstSeenDate = [existing.firstSeenDate, date].filter(Boolean).sort()[0]
    const latestDates = [existing.latestEventDate, date].filter(Boolean).sort()
    existing.latestEventDate = latestDates[latestDates.length - 1]
    existing.status = pickStrongerSubscriptionStatus(existing.status, nextStatus, existing.latestEventDate === date)
    existing.billingPeriod = billingPeriod !== 'unknown' ? billingPeriod : existing.billingPeriod
    existing.latestAmount = amount || existing.latestAmount
    existing.currency = currency || existing.currency
    existing.eventIds.push(eventId)
    existing.rawRefs.push({ source: 'subscription_history', filePath, recordId: eventId, type: 'event' })
  })

  return {
    subscriptions: Array.from(subscriptions.values()).sort((a, b) => (b.latestEventDate ?? '').localeCompare(a.latestEventDate ?? '')),
    events: events.sort((a, b) => a.date.localeCompare(b.date)),
    skippedCount,
    warnings,
  }
}

function normalizeSubscriptionName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeSubscriptionEventType(value: string): AppleSubscriptionEvent['eventType'] {
  const upper = value.trim().toUpperCase()
  if (upper.includes('TRIAL')) return 'trial'
  if (upper.includes('CANCEL')) return 'cancel'
  if (upper.includes('EXPIRE')) return 'expire'
  if (upper.includes('RENEW')) return 'renewal'
  if (upper.includes('REFUND')) return 'refund'
  if (upper.includes('START') || upper.includes('PURCHASE') || upper.includes('BEGIN') || upper.includes('SUBSCRIBE')) return 'start'
  return 'unknown'
}

function normalizeBillingPeriod(value: string): AppleSubscription['billingPeriod'] {
  const upper = value.trim().toUpperCase()
  if (upper.includes('WEEK')) return 'weekly'
  if (upper.includes('MONTH')) return 'monthly'
  if (upper.includes('YEAR') || upper.includes('ANNUAL')) return 'yearly'
  if (upper.includes('ONE')) return 'one_time'
  return 'unknown'
}

function resolveSubscriptionStatus(eventType: AppleSubscriptionEvent['eventType'], statusText: string): AppleSubscription['status'] {
  const upper = statusText.trim().toUpperCase()
  if (eventType === 'cancel') return 'cancelled'
  if (eventType === 'expire') return 'expired'
  if (eventType === 'start' || eventType === 'renewal' || eventType === 'trial') return 'active'
  if (upper.includes('ACTIVE')) return 'active'
  if (upper.includes('CANCEL')) return 'cancelled'
  if (upper.includes('EXPIRE')) return 'expired'
  return 'unknown'
}

function pickStrongerSubscriptionStatus(
  current: AppleSubscription['status'],
  incoming: AppleSubscription['status'],
  preferIncoming: boolean,
): AppleSubscription['status'] {
  if (preferIncoming && incoming !== 'unknown') return incoming
  if (current === 'unknown' && incoming !== 'unknown') return incoming
  return current
}
