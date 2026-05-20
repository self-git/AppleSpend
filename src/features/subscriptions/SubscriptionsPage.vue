<script setup lang="ts">
import { computed, ref } from 'vue'
import AppleButton from '@/components/ui/AppleButton.vue'
import AppleCard from '@/components/ui/AppleCard.vue'
import AppleDataBadge from '@/components/ui/AppleDataBadge.vue'
import AppleMetric from '@/components/ui/AppleMetric.vue'
import ApplePageHeader from '@/components/ui/ApplePageHeader.vue'
import AppleSectionTitle from '@/components/ui/AppleSectionTitle.vue'
import { useTransactionStore } from '@/features/transactions/transaction-store'
import { calculateSubscriptionSummary, type SubscriptionViewModel } from './subscription-selectors'
import { formatMoney } from '@/lib/money'
import { paymentMethodLabel } from '@/features/transactions/transaction-labels'

const store = useTransactionStore()
const keyword = ref('')
const status = ref<'all' | 'active' | 'expired' | 'cancelled' | 'unknown'>('all')
const drawerVisible = ref(false)
const selectedSubscription = ref<SubscriptionViewModel>()

const summary = computed(() => calculateSubscriptionSummary(store.transactions, store.subscriptions, store.subscriptionEvents, store.ruleSettings))
const filteredSubscriptions = computed(() =>
  summary.value.subscriptions.filter((item) => {
    if (status.value !== 'all' && item.status !== status.value) return false
    if (keyword.value && !`${item.serviceName} ${item.productName ?? ''}`.toLowerCase().includes(keyword.value.toLowerCase())) return false
    return true
  }),
)

function openDetail(subscription: SubscriptionViewModel) {
  selectedSubscription.value = subscription
  drawerVisible.value = true
}

async function updateStatus(value: SubscriptionViewModel['status']) {
  if (!selectedSubscription.value) return
  const {
    totalSpend: _totalSpend,
    latestChargeAmount: _latestChargeAmount,
    linkedTransactions: _linkedTransactions,
    timeline: _timeline,
    ...subscription
  } = selectedSubscription.value
  const next = { ...subscription, status: value }
  await store.upsertSubscription(next)
  selectedSubscription.value = summary.value.subscriptions.find((item) => item.id === next.id)
}

function statusLabel(value: SubscriptionViewModel['status'] | 'all'): string {
  const labels = {
    all: '全部',
    active: '活跃',
    expired: '已到期',
    cancelled: '已取消',
    unknown: '未知',
  }
  return labels[value]
}
</script>

<template>
  <main>
    <ApplePageHeader
      eyebrow="订阅"
      title="长期订阅的真实时间线"
      description="以交易为实际支出来源，以订阅历史补足状态、事件和续费节奏。"
    />

    <div class="mx-auto space-y-8 px-5 pb-12 md:px-8 lg:max-w-7xl">
      <AppleCard tone="raised">
        <div class="grid gap-4 md:grid-cols-4">
          <AppleMetric label="累计订阅支出" :value="formatMoney(summary.totalSpend)" tone="quiet" />
          <AppleMetric label="活跃订阅数" :value="`${summary.activeCount}`" tone="quiet" />
          <AppleMetric label="月均成本" :value="formatMoney(summary.monthlyCost)" tone="quiet" />
          <AppleMetric label="年化成本" :value="formatMoney(summary.yearlyCost)" tone="quiet" />
        </div>
      </AppleCard>

      <AppleCard>
        <div class="grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
          <el-input v-model="keyword" clearable placeholder="搜索服务名、产品名" />
          <el-select v-model="status" placeholder="状态">
            <el-option label="全部" value="all" />
            <el-option label="活跃" value="active" />
            <el-option label="已到期" value="expired" />
            <el-option label="已取消" value="cancelled" />
            <el-option label="未知" value="unknown" />
          </el-select>
        </div>
      </AppleCard>

      <AppleCard :padded="false">
        <div class="divide-y divide-apple-line">
          <button
            v-for="item in filteredSubscriptions"
            :key="item.id"
            type="button"
            class="focus-ring grid w-full gap-4 px-5 py-4 text-left transition hover:bg-apple-bg md:grid-cols-[1.2fr_120px_140px_140px]"
            @click="openDetail(item)"
          >
            <div>
              <p class="font-semibold">{{ item.serviceName }}</p>
              <p class="mt-1 text-sm text-apple-gray">{{ item.productName || item.appName || '无产品细分' }}</p>
            </div>
            <AppleDataBadge
              :tone="item.status === 'active' ? 'green' : item.status === 'unknown' ? 'orange' : 'default'"
              class="justify-self-start"
            >
              {{ statusLabel(item.status) }}
            </AppleDataBadge>
            <div>
              <p class="text-xs text-apple-gray">最近扣费</p>
              <p class="mt-1 font-semibold">{{ item.latestEventDate || '未知' }}</p>
            </div>
            <div>
              <p class="text-xs text-apple-gray">累计支出</p>
              <p class="mt-1 font-semibold">{{ formatMoney(item.totalSpend) }}</p>
            </div>
          </button>
        </div>
      </AppleCard>
    </div>

    <el-drawer v-model="drawerVisible" size="min(640px, 96vw)" title="订阅详情">
      <div v-if="selectedSubscription" class="space-y-6">
        <div class="grid gap-3 md:grid-cols-3">
          <div class="rounded-md bg-apple-bg p-4">
            <p class="text-sm text-apple-gray">状态</p>
            <p class="mt-1 text-xl font-semibold">{{ statusLabel(selectedSubscription.status) }}</p>
          </div>
          <div class="rounded-md bg-apple-bg p-4">
            <p class="text-sm text-apple-gray">最近一次金额</p>
            <p class="mt-1 text-xl font-semibold">{{ formatMoney(selectedSubscription.latestChargeAmount || selectedSubscription.latestAmount || 0) }}</p>
          </div>
          <div class="rounded-md bg-apple-bg p-4">
            <p class="text-sm text-apple-gray">累计支出</p>
            <p class="mt-1 text-xl font-semibold">{{ formatMoney(selectedSubscription.totalSpend) }}</p>
          </div>
        </div>

        <AppleCard tone="subtle" :interactive="false">
          <AppleSectionTitle title="手动修正状态" description="当订阅历史无法可靠判断时，可以在这里覆盖状态。" />
          <el-select class="w-full" :model-value="selectedSubscription.status" @change="updateStatus($event)">
            <el-option label="活跃" value="active" />
            <el-option label="已到期" value="expired" />
            <el-option label="已取消" value="cancelled" />
            <el-option label="未知" value="unknown" />
          </el-select>
        </AppleCard>

        <div>
          <AppleSectionTitle title="事件时间线" />
          <div class="space-y-3">
            <div v-for="event in selectedSubscription.timeline" :key="event.id" class="rounded-md border border-apple-line bg-white p-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="font-semibold">{{ event.eventType }}</p>
                  <p class="mt-1 text-sm text-apple-gray">{{ event.date }}{{ event.orderNumber ? ` · ${event.orderNumber}` : '' }}</p>
                </div>
                <AppleDataBadge v-if="event.amount" tone="blue">{{ formatMoney(event.amount, event.currency) }}</AppleDataBadge>
              </div>
            </div>
          </div>
        </div>

        <div>
          <AppleSectionTitle title="关联交易" />
          <div class="space-y-3">
            <div v-for="transaction in selectedSubscription.linkedTransactions" :key="transaction.id" class="rounded-md bg-apple-bg p-4">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="font-medium">{{ transaction.title }}</p>
                  <p class="mt-1 text-sm text-apple-gray">{{ transaction.date }} · {{ paymentMethodLabel(transaction.paymentMethod) }}</p>
                </div>
                <AppleButton variant="text" disabled>{{ formatMoney(transaction.amount, transaction.currency) }}</AppleButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>
  </main>
</template>
