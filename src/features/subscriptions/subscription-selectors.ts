import Decimal from 'decimal.js'
import type { AppleSubscription, AppleSubscriptionEvent, AppleTransaction, RuleSetting } from '@/features/transactions/transaction-model'
import { createId } from '@/lib/id'
import { parseMoney } from '@/lib/money'
import { applyRulesToTransaction, resolveSubscriptionDisplayName } from '@/features/rules/rule-helpers'

export interface SubscriptionViewModel extends AppleSubscription {
  totalSpend: Decimal
  latestChargeAmount: Decimal
  linkedTransactions: AppleTransaction[]
  timeline: AppleSubscriptionEvent[]
}

export interface SubscriptionDashboardSummary {
  totalSpend: Decimal
  activeCount: number
  monthlyCost: Decimal
  yearlyCost: Decimal
  subscriptions: SubscriptionViewModel[]
}

export function calculateSubscriptionSummary(
  transactions: AppleTransaction[],
  importedSubscriptions: AppleSubscription[],
  importedEvents: AppleSubscriptionEvent[],
  ruleSettings: RuleSetting[],
): SubscriptionDashboardSummary {
  const normalizedMap = new Map<string, SubscriptionViewModel>()

  importedSubscriptions.forEach((subscription) => {
    const displayName = resolveSubscriptionDisplayName(subscription.serviceName, ruleSettings)
    normalizedMap.set(normalizeKey(displayName), {
      ...subscription,
      serviceName: displayName,
      totalSpend: new Decimal(0),
      latestChargeAmount: new Decimal(subscription.latestAmount || 0),
      linkedTransactions: [],
      timeline: importedEvents.filter((event) => event.subscriptionId === subscription.id).sort((a, b) => b.date.localeCompare(a.date)),
    })
  })

  const subscriptionTransactions = transactions
    .map((transaction) => applyRulesToTransaction(transaction, ruleSettings))
    .filter((transaction) => !transaction.excluded && transaction.source === 'subscription')

  subscriptionTransactions.forEach((transaction) => {
    const displayName = resolveSubscriptionDisplayName(transaction.title, ruleSettings)
    const key = normalizeKey(displayName)
    const existing =
      normalizedMap.get(key) ??
      ({
        id: createId('sub-derived', [key]),
        serviceName: displayName,
        status: 'unknown',
        billingPeriod: inferBillingPeriodFromTitle(displayName),
        sourceTransactionIds: [],
        eventIds: [],
        rawRefs: [{ source: 'media_transactions', recordId: transaction.id }],
        totalSpend: new Decimal(0),
        latestChargeAmount: new Decimal(0),
        linkedTransactions: [],
        timeline: [],
      } satisfies SubscriptionViewModel)

    existing.sourceTransactionIds = [...new Set([...existing.sourceTransactionIds, transaction.id])]
    existing.linkedTransactions = [...existing.linkedTransactions, transaction]
    existing.totalSpend = existing.totalSpend.plus(parseMoney(transaction.amount).abs())
    existing.latestChargeAmount = parseMoney(transaction.amount).abs()
    const latestDates = [existing.latestEventDate, transaction.date].filter(Boolean).sort()
    existing.latestEventDate = latestDates[latestDates.length - 1]
    existing.firstSeenDate = [existing.firstSeenDate, transaction.date].filter(Boolean).sort()[0]
    if (existing.status === 'unknown') existing.status = 'active'
    normalizedMap.set(key, existing)
  })

  const subscriptions = Array.from(normalizedMap.values())
    .map((subscription) => ({
      ...subscription,
      timeline: resolveTimeline(subscription, importedEvents),
    }))
    .sort((a, b) => (b.latestEventDate ?? '').localeCompare(a.latestEventDate ?? ''))

  const totalSpend = subscriptions.reduce((total, item) => total.plus(item.totalSpend), new Decimal(0))
  const monthlyCost = subscriptions.reduce((total, item) => total.plus(annualizedCost(item).div(12)), new Decimal(0))
  const yearlyCost = subscriptions.reduce((total, item) => total.plus(annualizedCost(item)), new Decimal(0))

  return {
    totalSpend,
    activeCount: subscriptions.filter((item) => item.status === 'active').length,
    monthlyCost,
    yearlyCost,
    subscriptions,
  }
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function inferBillingPeriodFromTitle(value: string): AppleSubscription['billingPeriod'] {
  const upper = value.toUpperCase()
  if (upper.includes('MONTH')) return 'monthly'
  if (upper.includes('YEAR') || upper.includes('ANNUAL')) return 'yearly'
  if (upper.includes('WEEK')) return 'weekly'
  return 'unknown'
}

function annualizedCost(subscription: SubscriptionViewModel): Decimal {
  const amount = subscription.latestChargeAmount.gt(0) ? subscription.latestChargeAmount : subscription.totalSpend
  switch (subscription.billingPeriod) {
    case 'weekly':
      return amount.times(52)
    case 'monthly':
      return amount.times(12)
    case 'yearly':
      return amount
    case 'one_time':
      return new Decimal(0)
    default:
      return amount.times(12)
  }
}

function resolveTimeline(subscription: SubscriptionViewModel, importedEvents: AppleSubscriptionEvent[]): AppleSubscriptionEvent[] {
  const importedTimeline = subscription.eventIds.length
    ? importedEvents.filter((event) => event.subscriptionId === subscription.id)
    : subscription.timeline
  const syntheticEvents = subscription.linkedTransactions.map((transaction) => ({
    id: createId('subevt-derived', [subscription.id, transaction.id]),
    subscriptionId: subscription.id,
    date: transaction.date,
    eventType: transaction.isRefund ? ('refund' as const) : ('renewal' as const),
    amount: transaction.amount,
    currency: transaction.currency,
    orderNumber: transaction.orderNumber,
    raw: transaction.raw,
  }))

  const seen = new Set<string>()
  return [...importedTimeline, ...syntheticEvents]
    .filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}
