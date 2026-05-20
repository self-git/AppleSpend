import type { AppleAsset, AppleTransaction, RuleSetting } from '@/features/transactions/transaction-model'
import { defaultRuleSettings } from './default-rules'

export interface EffectiveTransaction extends AppleTransaction {
  effectiveCategory: string
  effectiveCashImpact: boolean
  excluded: boolean
}

export function mergeRuleSettings(userRules: RuleSetting[]): RuleSetting[] {
  return [...defaultRuleSettings, ...userRules]
}

export function ruleMatches(matcher: string, value: string): boolean {
  if (!matcher.trim()) return false
  return value.toUpperCase().includes(matcher.trim().toUpperCase())
}

export function applyRulesToTransaction(transaction: AppleTransaction, userRules: RuleSetting[]): EffectiveTransaction {
  const rules = mergeRuleSettings(userRules).filter((rule) => rule.enabled)
  const haystack = [transaction.title, transaction.subtitle, transaction.category, transaction.paymentMethod, transaction.orderNumber]
    .map((item) => String(item ?? ''))
    .join(' ')

  const excluded = rules.some((rule) => rule.type === 'exclude' && ruleMatches(rule.matcher, haystack))
  const categoryRule = rules.find((rule) => rule.type === 'category' && ruleMatches(rule.matcher, haystack))
  const cashRule = rules.find((rule) => rule.type === 'cash_flow' && ruleMatches(rule.matcher, haystack))
  const effectiveCategory = categoryRule?.value || transaction.category
  const effectiveCashImpact =
    cashRule?.value === 'cash'
      ? true
      : cashRule?.value === 'non_cash'
        ? false
        : resolveStoreCreditPayment(transaction, rules)
          ? false
          : transaction.cashImpact

  return {
    ...transaction,
    effectiveCategory,
    effectiveCashImpact,
    excluded,
  }
}

export function resolveSubscriptionDisplayName(name: string, userRules: RuleSetting[]): string {
  const rules = mergeRuleSettings(userRules).filter((rule) => rule.enabled && rule.type === 'subscription_alias')
  return rules.find((rule) => ruleMatches(rule.matcher, name))?.value || name
}

export function resolveDeviceDisplayName(name: string, userRules: RuleSetting[]): string {
  const rules = mergeRuleSettings(userRules).filter((rule) => rule.enabled && rule.type === 'device_alias')
  return rules.find((rule) => ruleMatches(rule.matcher, name))?.value || name
}

export function applyRulesToAsset(asset: AppleAsset, userRules: RuleSetting[]): AppleAsset {
  return {
    ...asset,
    name: resolveDeviceDisplayName(asset.name, userRules),
  }
}

export function resolveStoreCreditPayment(transaction: AppleTransaction, rules: RuleSetting[]): boolean {
  const payment = String(transaction.paymentMethod ?? '').toUpperCase()
  if (payment.includes('STORE CREDIT')) return true
  return rules.some((rule) => rule.type === 'store_credit' && rule.enabled && ruleMatches(rule.matcher, payment))
}
