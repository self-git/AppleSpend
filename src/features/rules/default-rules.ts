import type { RuleSetting } from '@/features/transactions/transaction-model'

export const defaultRuleSettings: RuleSetting[] = [
  {
    id: 'default_store_credit_alias',
    type: 'store_credit',
    name: '余额支付识别',
    enabled: true,
    matcher: 'STORE CREDIT',
    value: 'store_credit_payment',
    note: '用于把账户余额消费从现金支出中排除。',
    updatedAt: 'system',
  },
  {
    id: 'default_subscription_alias_icloud',
    type: 'subscription_alias',
    name: 'iCloud+ 名称归一',
    enabled: true,
    matcher: 'ICLOUD',
    value: 'iCloud+',
    updatedAt: 'system',
  },
  {
    id: 'default_subscription_alias_apple_music',
    type: 'subscription_alias',
    name: 'Apple Music 名称归一',
    enabled: true,
    matcher: 'APPLE MUSIC',
    value: 'Apple Music',
    updatedAt: 'system',
  },
]
