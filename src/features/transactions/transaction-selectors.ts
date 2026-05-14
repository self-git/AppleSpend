import Decimal from 'decimal.js'
import type { AppleAsset, AppleTransaction } from './transaction-model'
import { getYear } from '@/lib/date'
import { formatMoney, parseMoney } from '@/lib/money'

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

export function calculateSummary(transactions: AppleTransaction[], assets: AppleAsset[]): DashboardSummary {
  const cashTransactions = transactions.filter((item) => item.cashImpact)
  const billTransactions = transactions.filter((item) => item.billValueImpact)
  const hardwareTransactions = cashTransactions.filter((item) => item.source === 'apple_store')
  const softwareTransactions = cashTransactions.filter((item) => item.source !== 'apple_store')
  const storeCreditTransactions = transactions.filter((item) => item.paymentMethod?.toUpperCase().includes('STORE CREDIT'))
  const storeCreditRecharge = transactions.filter((item) => item.category === 'Store Credit' && item.cashImpact)
  const storeCreditRechargeTotal = sumTransactions(storeCreditRecharge)
  const storeCreditSpendTotal = sumTransactions(storeCreditTransactions)

  const years = Array.from(new Set(transactions.map((item) => getYear(item.date)))).filter((year) => year !== '未知').sort()
  const byYear = years.map((year) => {
    const yearly = transactions.filter((item) => getYear(item.date) === year)
    const yearlyCash = yearly.filter((item) => item.cashImpact)
    return {
      year,
      cash: sumTransactions(yearlyCash),
      bill: sumTransactions(yearly.filter((item) => item.billValueImpact)),
      hardware: sumTransactions(yearlyCash.filter((item) => item.source === 'apple_store')),
      software: sumTransactions(yearlyCash.filter((item) => item.source !== 'apple_store')),
    }
  })

  return {
    cashSpend: sumTransactions(cashTransactions),
    billValue: sumTransactions(billTransactions),
    hardwareSpend: sumTransactions(hardwareTransactions),
    softwareSpend: sumTransactions(softwareTransactions),
    storeCreditSpend: storeCreditSpendTotal,
    storeCreditRecharge: storeCreditRechargeTotal,
    storeCreditBalance: storeCreditRechargeTotal.minus(storeCreditSpendTotal),
    freeCount: transactions.filter((item) => item.isFree).length,
    years,
    byYear,
    byCategory: groupByAmount(cashTransactions, (item) => item.category),
    byPayment: groupByAmount(cashTransactions, (item) => item.paymentMethod || 'Unknown'),
    topTransactions: [...transactions]
      .filter((item) => item.billValueImpact)
      .sort((a, b) => parseMoney(b.amount).abs().cmp(parseMoney(a.amount).abs()))
      .slice(0, 10),
    recentTransactions: [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    warnings: buildQualityWarnings(transactions, assets),
  }
}

export function formatSummaryMoney(value: Decimal, currency = 'CNY'): string {
  return formatMoney(value, currency)
}

export function sumTransactions(transactions: AppleTransaction[]): Decimal {
  return transactions.reduce((total, item) => total.plus(parseMoney(item.amount)), new Decimal(0))
}

function groupByAmount(transactions: AppleTransaction[], getKey: (transaction: AppleTransaction) => string): Array<{ name: string; value: Decimal }> {
  const groups = new Map<string, Decimal>()
  transactions.forEach((item) => {
    const key = getKey(item) || 'Unknown'
    groups.set(key, (groups.get(key) ?? new Decimal(0)).plus(parseMoney(item.amount)))
  })
  return Array.from(groups.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value.cmp(a.value))
}

function buildQualityWarnings(transactions: AppleTransaction[], assets: AppleAsset[]): string[] {
  const warnings: string[] = []
  if (!transactions.length) warnings.push('尚未导入 CSV，Dashboard 当前没有真实数据。')
  if (transactions.some((item) => !item.date)) warnings.push('存在缺少日期的记录，建议检查源 CSV。')
  if (assets.some((item) => item.category === 'Other')) warnings.push('有硬件订单未能识别类别，已放入 Other。')
  if (transactions.some((item) => item.paymentMethod === 'Unknown')) warnings.push('部分 App Store 记录缺少支付方式，未计入实际现金支出。')
  return warnings
}
