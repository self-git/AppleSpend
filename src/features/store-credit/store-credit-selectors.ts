import Decimal from 'decimal.js'
import type { AppleTransaction, RuleSetting, StoreCreditEntry } from '@/features/transactions/transaction-model'
import { createId } from '@/lib/id'
import { parseMoney } from '@/lib/money'
import { applyRulesToTransaction, mergeRuleSettings, resolveStoreCreditPayment } from '@/features/rules/rule-helpers'
import { categoryLabel } from '@/features/transactions/transaction-labels'

export interface ResolvedStoreCreditEntry extends StoreCreditEntry {
  linkedTransaction?: AppleTransaction
}

export interface StoreCreditSummary {
  recharge: Decimal
  spend: Decimal
  refund: Decimal
  adjustment: Decimal
  balance: Decimal
  timeline: ResolvedStoreCreditEntry[]
  destinationBreakdown: Array<{ name: string; value: Decimal }>
  linkedCoverage: number
}

export function calculateStoreCreditSummary(
  transactions: AppleTransaction[],
  explicitEntries: StoreCreditEntry[],
  ruleSettings: RuleSetting[],
): StoreCreditSummary {
  const timeline = resolveStoreCreditTimeline(transactions, explicitEntries, ruleSettings)
  const recharge = sumDirections(timeline, ['recharge'])
  const spend = sumDirections(timeline, ['spend'])
  const refund = sumDirections(timeline, ['refund'])
  const adjustment = sumDirections(timeline, ['adjustment'])
  const balance = recharge.minus(spend).plus(refund).plus(adjustment)
  const linkedCount = timeline.filter((item) => item.linkedTransaction).length

  return {
    recharge,
    spend,
    refund,
    adjustment,
    balance,
    timeline,
    destinationBreakdown: groupSpendDestinations(timeline),
    linkedCoverage: timeline.length ? (linkedCount / timeline.length) * 100 : 100,
  }
}

export function resolveStoreCreditTimeline(
  transactions: AppleTransaction[],
  explicitEntries: StoreCreditEntry[],
  ruleSettings: RuleSetting[],
): ResolvedStoreCreditEntry[] {
  const transactionEntries = deriveStoreCreditEntriesFromTransactions(transactions, ruleSettings)
  const combined = [...explicitEntries, ...transactionEntries]
  const deduped = new Map<string, StoreCreditEntry>()

  combined.forEach((entry) => {
    const key = [
      entry.direction,
      entry.date,
      parseMoney(entry.amount).abs().toFixed(2),
      entry.orderNumber ?? '',
      entry.relatedTransactionId ?? '',
    ].join('|')

    if (!deduped.has(key) || deduped.get(key)?.source === 'media_transactions') {
      deduped.set(key, entry)
    }
  })

  return Array.from(deduped.values())
    .map((entry) => ({
      ...entry,
      linkedTransaction:
        transactions.find((transaction) => transaction.id === entry.relatedTransactionId) ??
        matchStoreCreditTransaction(entry, transactions, ruleSettings),
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function deriveStoreCreditEntriesFromTransactions(
  transactions: AppleTransaction[],
  ruleSettings: RuleSetting[],
): StoreCreditEntry[] {
  const rules = mergeRuleSettings(ruleSettings)
  return transactions.flatMap<StoreCreditEntry>((transaction) => {
    const effective = applyRulesToTransaction(transaction, ruleSettings)
    if (effective.excluded || effective.isFree) return []

    if (effective.category === 'Store Credit' && effective.effectiveCashImpact) {
      return [
        {
          id: createId('credit-media', ['recharge', transaction.id]),
          date: transaction.date,
          direction: 'recharge' as const,
          amount: transaction.amount,
          currency: transaction.currency,
          source: 'media_transactions' as const,
          relatedTransactionId: transaction.id,
          orderNumber: transaction.orderNumber,
          raw: transaction.raw,
        },
      ]
    }

    if (resolveStoreCreditPayment(transaction, rules)) {
      return [
        {
          id: createId('credit-media', ['spend', transaction.id]),
          date: transaction.date,
          direction: transaction.isRefund ? ('refund' as const) : ('spend' as const),
          amount: transaction.amount,
          currency: transaction.currency,
          source: 'media_transactions' as const,
          relatedTransactionId: transaction.id,
          orderNumber: transaction.orderNumber,
          raw: transaction.raw,
        },
      ]
    }

    return []
  })
}

function matchStoreCreditTransaction(
  entry: StoreCreditEntry,
  transactions: AppleTransaction[],
  ruleSettings: RuleSetting[],
): AppleTransaction | undefined {
  return transactions.find((transaction) => {
    if (entry.relatedTransactionId && transaction.id === entry.relatedTransactionId) return true
    if (!resolveStoreCreditPayment(transaction, mergeRuleSettings(ruleSettings))) return false
    if (entry.orderNumber && transaction.orderNumber && entry.orderNumber === transaction.orderNumber) return true
    return transaction.date === entry.date && parseMoney(transaction.amount).abs().eq(parseMoney(entry.amount).abs())
  })
}

function sumDirections(entries: StoreCreditEntry[], directions: StoreCreditEntry['direction'][]): Decimal {
  return entries.reduce((total, entry) => (directions.includes(entry.direction) ? total.plus(parseMoney(entry.amount).abs()) : total), new Decimal(0))
}

function groupSpendDestinations(entries: ResolvedStoreCreditEntry[]): Array<{ name: string; value: Decimal }> {
  const groups = new Map<string, Decimal>()
  entries
    .filter((entry) => entry.direction === 'spend')
    .forEach((entry) => {
      const name = entry.linkedTransaction?.category ? categoryLabel(entry.linkedTransaction.category) : entry.linkedTransaction?.title || '未关联消费'
      groups.set(name, (groups.get(name) ?? new Decimal(0)).plus(parseMoney(entry.amount).abs()))
    })
  return Array.from(groups.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value.cmp(a.value))
}
