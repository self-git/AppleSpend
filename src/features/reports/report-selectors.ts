import Decimal from 'decimal.js'
import type {
  AppleAsset,
  AppleSubscription,
  AppleSubscriptionEvent,
  AppleTransaction,
  RuleSetting,
  StoreCreditEntry,
} from '@/features/transactions/transaction-model'
import { getYear } from '@/lib/date'
import { formatMoney, parseMoney } from '@/lib/money'
import { applyRulesToTransaction } from '@/features/rules/rule-helpers'
import { calculateStoreCreditSummary } from '@/features/store-credit/store-credit-selectors'
import { calculateSubscriptionSummary } from '@/features/subscriptions/subscription-selectors'

export interface YearlyReport {
  year: string
  cashSpend: Decimal
  hardwareSpend: Decimal
  softwareSpend: Decimal
  subscriptionSpend: Decimal
  storeCreditRecharge: Decimal
  storeCreditSpend: Decimal
  newDevices: AppleAsset[]
  topTransaction?: AppleTransaction
  previousYearDelta: Decimal
}

export function buildYearlyReport(
  year: string,
  transactions: AppleTransaction[],
  assets: AppleAsset[],
  subscriptions: AppleSubscription[],
  subscriptionEvents: AppleSubscriptionEvent[],
  storeCreditEntries: StoreCreditEntry[],
  ruleSettings: RuleSetting[],
): YearlyReport {
  const effectiveTransactions = transactions.map((item) => applyRulesToTransaction(item, ruleSettings)).filter((item) => !item.excluded)
  const yearlyTransactions = effectiveTransactions.filter((item) => item.date.startsWith(year))
  const previousYear = String(Number(year) - 1)
  const previousYearTransactions = effectiveTransactions.filter((item) => item.date.startsWith(previousYear))
  const storeCreditSummary = calculateStoreCreditSummary(
    transactions.filter((item) => item.date.startsWith(year)),
    storeCreditEntries.filter((item) => item.date.startsWith(year)),
    ruleSettings,
  )
  const subscriptionSummary = calculateSubscriptionSummary(
    transactions.filter((item) => item.date.startsWith(year)),
    subscriptions,
    subscriptionEvents,
    ruleSettings,
  )

  return {
    year,
    cashSpend: sumAmounts(yearlyTransactions.filter((item) => item.effectiveCashImpact)),
    hardwareSpend: sumAmounts(yearlyTransactions.filter((item) => item.effectiveCashImpact && (item.source === 'apple_store' || item.source === 'external_retail'))),
    softwareSpend: sumAmounts(yearlyTransactions.filter((item) => item.effectiveCashImpact && item.source !== 'apple_store' && item.source !== 'external_retail')),
    subscriptionSpend: subscriptionSummary.totalSpend,
    storeCreditRecharge: storeCreditSummary.recharge,
    storeCreditSpend: storeCreditSummary.spend,
    newDevices: assets.filter((item) => getYear(item.purchaseDate) === year),
    topTransaction: [...yearlyTransactions]
      .sort((a, b) => parseMoney(b.amount).abs().cmp(parseMoney(a.amount).abs()))[0],
    previousYearDelta: sumAmounts(yearlyTransactions.filter((item) => item.effectiveCashImpact)).minus(
      sumAmounts(previousYearTransactions.filter((item) => item.effectiveCashImpact)),
    ),
  }
}

export function buildYearlyReportMarkdown(report: YearlyReport): string {
  return [
    `# Apple 年度消费报告 ${report.year}`,
    '',
    `- 年度总现金支出：${formatMoney(report.cashSpend)}`,
    `- 年度硬件支出：${formatMoney(report.hardwareSpend)}`,
    `- 年度软件 / App 支出：${formatMoney(report.softwareSpend)}`,
    `- 年度订阅支出：${formatMoney(report.subscriptionSpend)}`,
    `- 年度余额充值：${formatMoney(report.storeCreditRecharge)}`,
    `- 年度余额消费：${formatMoney(report.storeCreditSpend)}`,
    `- 年度新增设备：${report.newDevices.length} 台/件`,
    `- 与上一年对比：${formatMoney(report.previousYearDelta)}`,
    '',
    '## 年度最高单笔消费',
    report.topTransaction
      ? `- ${report.topTransaction.date} · ${report.topTransaction.title} · ${formatMoney(report.topTransaction.amount, report.topTransaction.currency)}`
      : '- 无',
    '',
    '## 年度新增设备',
    ...(report.newDevices.length
      ? report.newDevices.map(
          (device) => `- ${device.purchaseDate} · ${device.name} · ${formatMoney(device.purchasePrice, device.currency)} · ${device.status}`,
        )
      : ['- 无']),
  ].join('\n')
}

function sumAmounts(transactions: Array<{ amount: string }>): Decimal {
  return transactions.reduce((total, item) => total.plus(parseMoney(item.amount)), new Decimal(0))
}
