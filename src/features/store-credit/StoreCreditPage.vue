<script setup lang="ts">
import { computed } from 'vue'
import AppleCard from '@/components/ui/AppleCard.vue'
import AppleDataBadge from '@/components/ui/AppleDataBadge.vue'
import AppleMetric from '@/components/ui/AppleMetric.vue'
import ApplePageHeader from '@/components/ui/ApplePageHeader.vue'
import AppleSectionTitle from '@/components/ui/AppleSectionTitle.vue'
import { useTransactionStore } from '@/features/transactions/transaction-store'
import { calculateStoreCreditSummary } from './store-credit-selectors'
import { formatMoney } from '@/lib/money'
import { sourceLabel, storeCreditDirectionLabel } from '@/features/transactions/transaction-labels'

const store = useTransactionStore()
const summary = computed(() => calculateStoreCreditSummary(store.transactions, store.storeCreditEntries, store.ruleSettings))
const spendRatio = computed(() => (summary.value.recharge.gt(0) ? summary.value.spend.div(summary.value.recharge).times(100).toNumber() : 0))
</script>

<template>
  <main>
    <ApplePageHeader
      eyebrow="余额"
      title="账户余额中心"
      description="统一追踪充值、消费、退款和调整，口径与 Dashboard 保持一致。"
    />

    <div class="mx-auto space-y-8 px-5 pb-12 md:px-8 lg:max-w-7xl">
      <AppleCard tone="raised">
        <div class="grid gap-4 md:grid-cols-4">
          <AppleMetric label="累计充值" :value="formatMoney(summary.recharge)" tone="quiet" />
          <AppleMetric label="已消费" :value="formatMoney(summary.spend)" tone="quiet" />
          <AppleMetric label="退款 / 调整" :value="formatMoney(summary.refund.plus(summary.adjustment))" tone="quiet" />
          <AppleMetric label="当前估算余额" :value="formatMoney(summary.balance)" tone="quiet" />
        </div>
        <div class="mt-6 rounded-[var(--radius-panel)] border border-apple-line bg-white p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-sm font-medium text-apple-gray">余额使用进度</p>
              <p class="mt-1 text-sm text-[#515154]">已关联 {{ summary.linkedCoverage.toFixed(0) }}% 的余额流水到具体消费记录。</p>
            </div>
            <AppleDataBadge tone="blue">{{ formatMoney(summary.spend) }} / {{ formatMoney(summary.recharge) }}</AppleDataBadge>
          </div>
          <div class="mt-4 h-3 overflow-hidden rounded-full bg-apple-bg">
            <div class="h-full rounded-full bg-apple-blue transition-all duration-500" :style="{ width: `${Math.min(spendRatio, 100)}%` }" />
          </div>
        </div>
      </AppleCard>

      <div class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <AppleCard>
          <AppleSectionTitle title="余额流水时间线" description="优先使用导入的 Apple 账户余额历史，缺失时回退到交易推导。" />
          <div class="divide-y divide-apple-line">
            <div v-for="entry in summary.timeline" :key="entry.id" class="grid gap-3 py-4 md:grid-cols-[120px_120px_1fr_140px] md:items-center">
              <div>
                <p class="font-medium">{{ entry.date }}</p>
                <p class="mt-1 text-xs text-apple-gray">{{ sourceLabel(entry.source) }}</p>
              </div>
              <AppleDataBadge
                :tone="
                  entry.direction === 'recharge'
                    ? 'green'
                    : entry.direction === 'spend'
                      ? 'orange'
                      : entry.direction === 'refund'
                        ? 'blue'
                        : 'default'
                "
              >
                {{ storeCreditDirectionLabel(entry.direction) }}
              </AppleDataBadge>
              <div class="min-w-0">
                <p class="truncate font-medium">{{ entry.linkedTransaction?.title || entry.raw.Description || '未关联流水' }}</p>
                <p class="mt-1 truncate text-sm text-apple-gray">
                  {{ entry.orderNumber || entry.linkedTransaction?.orderNumber || '无订单号' }}
                </p>
              </div>
              <div class="text-right">
                <p class="font-semibold">{{ formatMoney(entry.amount, entry.currency) }}</p>
                <p class="mt-1 text-xs text-apple-gray">{{ entry.balanceAfter ? `余额 ${formatMoney(entry.balanceAfter, entry.currency)}` : '无余额字段' }}</p>
              </div>
            </div>
          </div>
        </AppleCard>

        <AppleCard>
          <AppleSectionTitle title="消费去向" description="查看余额最终流向哪些类别。" />
          <div class="space-y-3">
            <div
              v-for="item in summary.destinationBreakdown"
              :key="item.name"
              class="rounded-[var(--radius-panel)] bg-apple-bg px-4 py-3"
            >
              <div class="flex items-center justify-between gap-4">
                <p class="font-medium">{{ item.name }}</p>
                <p class="font-semibold">{{ formatMoney(item.value) }}</p>
              </div>
            </div>
          </div>
          <p v-if="!summary.destinationBreakdown.length" class="text-sm text-apple-gray">还没有可展示的消费去向。</p>
        </AppleCard>
      </div>
    </div>
  </main>
</template>
