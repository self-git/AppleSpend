import Decimal from 'decimal.js'
import type { AppleAsset, AppleTransaction, DataQualityIssue, RuleSetting, StoreCreditEntry } from './transaction-model'
import { getYear } from '@/lib/date'
import { formatMoney, parseMoney } from '@/lib/money'
import { applyRulesToTransaction, resolveStoreCreditPayment } from '@/features/rules/rule-helpers'
import { calculateStoreCreditSummary } from '@/features/store-credit/store-credit-selectors'
import { categoryLabel, paymentMethodLabel } from '@/features/transactions/transaction-labels'

export interface DashboardSummary {
  cashSpend: Decimal
  billValue: Decimal
  hardwareSpend: Decimal
  softwareSpend: Decimal
  storeCreditSpend: Decimal
  storeCreditRecharge: Decimal
  storeCreditBalance: Decimal
  freeCount: number
  years: string[]
  byYear: Array<{ year: string; cash: Decimal; bill: Decimal; hardware: Decimal; software: Decimal }>
  byCategory: Array<{ name: string; value: Decimal }>
  byPayment: Array<{ name: string; value: Decimal }>
  topTransactions: AppleTransaction[]
  recentTransactions: AppleTransaction[]
  warnings: string[]
}

export function calculateSummary(
  transactions: AppleTransaction[],
  assets: AppleAsset[],
  storeCreditEntries: StoreCreditEntry[],
  ruleSettings: RuleSetting[],
  issues: DataQualityIssue[] = [],
): DashboardSummary {
  const effectiveTransactions = transactions.map((item) => applyRulesToTransaction(item, ruleSettings)).filter((item) => !item.excluded)
  const cashTransactions = effectiveTransactions.filter((item) => item.effectiveCashImpact)
  const billTransactions = effectiveTransactions.filter((item) => item.billValueImpact)
  const hardwareTransactions = cashTransactions.filter((item) => item.source === 'apple_store' || item.source === 'external_retail')
  const softwareTransactions = cashTransactions.filter((item) => item.source !== 'apple_store' && item.source !== 'external_retail')
  const storeCreditSummary = calculateStoreCreditSummary(transactions, storeCreditEntries, ruleSettings)

  const years = Array.from(new Set(effectiveTransactions.map((item) => getYear(item.date)))).filter((year) => year !== '未知').sort()
  const byYear = years.map((year) => {
    const yearly = effectiveTransactions.filter((item) => getYear(item.date) === year)
    const yearlyCash = yearly.filter((item) => item.effectiveCashImpact)
    return {
      year,
      cash: sumTransactions(yearlyCash),
      bill: sumTransactions(yearly.filter((item) => item.billValueImpact), 'bill'),
      hardware: sumTransactions(yearlyCash.filter((item) => item.source === 'apple_store' || item.source === 'external_retail')),
      software: sumTransactions(yearlyCash.filter((item) => item.source !== 'apple_store' && item.source !== 'external_retail')),
    }
  })

  return {
    cashSpend: sumTransactions(cashTransactions),
    billValue: sumTransactions(billTransactions, 'bill'),
    hardwareSpend: sumTransactions(hardwareTransactions),
    softwareSpend: sumTransactions(softwareTransactions),
    storeCreditSpend: storeCreditSummary.spend,
    storeCreditRecharge: storeCreditSummary.recharge,
    storeCreditBalance: storeCreditSummary.balance,
    freeCount: effectiveTransactions.filter((item) => item.isFree).length,
    years,
    byYear,
    byCategory: groupByAmount(cashTransactions, (item) => categoryLabel(item.effectiveCategory)),
    byPayment: groupByAmount(cashTransactions, (item) => paymentMethodLabel(item.paymentMethod)),
    topTransactions: [...effectiveTransactions]
      .filter((item) => item.billValueImpact)
      .sort((a, b) => transactionBillValue(b).abs().cmp(transactionBillValue(a).abs()))
      .slice(0, 10),
    recentTransactions: [...effectiveTransactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    warnings: buildQualityWarnings(effectiveTransactions, assets, issues),
  }
}

export function formatSummaryMoney(value: Decimal, currency = 'CNY'): string {
  return formatMoney(value, currency)
}

export function sumTransactions(transactions: Array<{ amount: string; billValueAmount?: string }>, mode: 'cash' | 'bill' = 'cash'): Decimal {
  return transactions.reduce((total, item) => total.plus(mode === 'bill' ? transactionBillValue(item) : parseMoney(item.amount)), new Decimal(0))
}

function transactionBillValue(transaction: { amount: string; billValueAmount?: string }): Decimal {
  return parseMoney(transaction.billValueAmount || transaction.amount)
}

function groupByAmount<T extends { amount: string }>(transactions: T[], getKey: (transaction: T) => string): Array<{ name: string; value: Decimal }> {
  const groups = new Map<string, Decimal>()
  transactions.forEach((item) => {
    const key = getKey(item) || '未知'
    groups.set(key, (groups.get(key) ?? new Decimal(0)).plus(parseMoney(item.amount)))
  })
  return Array.from(groups.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value.cmp(a.value))
}

function buildQualityWarnings(transactions: ReturnType<typeof applyRulesToTransaction>[], assets: AppleAsset[], issues: DataQualityIssue[]): string[] {
  const warnings: string[] = []
  if (!transactions.length) warnings.push('尚未导入 CSV，Dashboard 当前没有真实数据。')
  if (transactions.some((item) => !item.date)) warnings.push('存在缺少日期的记录，建议检查源 CSV。')
  if (assets.some((item) => item.category === 'Other')) warnings.push('有硬件订单未能识别类别，已放入 Other。')
  if (transactions.some((item) => !item.isFree && !item.effectiveCashImpact && !resolveStoreCreditPayment(item, [] as RuleSetting[])))
    warnings.push('部分记录不计入现金支出，建议检查支付方式和规则。')
  if (issues.some((item) => !item.dismissed && item.severity !== 'info')) warnings.push(`当前有 ${issues.filter((item) => !item.dismissed).length} 条待处理的数据质量问题。`)
  return warnings
}
