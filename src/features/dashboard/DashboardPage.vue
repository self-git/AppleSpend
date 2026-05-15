<script setup lang="ts">
import { computed, ref } from 'vue'
import Decimal from 'decimal.js'
import type { EChartsOption } from 'echarts'
import { RouterLink } from 'vue-router'
import AppleButton from '@/components/ui/AppleButton.vue'
import AppleCard from '@/components/ui/AppleCard.vue'
import AppleChart from '@/components/charts/AppleChart.vue'
import AppleDataBadge from '@/components/ui/AppleDataBadge.vue'
import AppleMetric from '@/components/ui/AppleMetric.vue'
import ApplePageHeader from '@/components/ui/ApplePageHeader.vue'
import AppleReveal from '@/components/ui/AppleReveal.vue'
import AppleSegmentedControl from '@/components/ui/AppleSegmentedControl.vue'
import AppleSectionTitle from '@/components/ui/AppleSectionTitle.vue'
import { calculateSummary, formatSummaryMoney } from './summary-calculator'
import { useTransactionStore } from '@/features/transactions/transaction-store'
import { formatMoney } from '@/lib/money'

const store = useTransactionStore()
const summary = computed(() => calculateSummary(store.transactions, store.assets))
const recentSpendFilter = ref<'all' | 'paid' | 'free'>('all')
const recentSpendOptions = [
  { label: '全部', value: 'all' },
  { label: '付费', value: 'paid' },
  { label: '免费', value: 'free' },
] satisfies Array<{ label: string; value: 'all' | 'paid' | 'free' }>

const storeCreditSpentRatio = computed(() => {
  if (summary.value.storeCreditRecharge.lte(0)) return 0
  return Decimal.min(summary.value.storeCreditSpend.div(summary.value.storeCreditRecharge).times(100), 100).toNumber()
})

const recentTransactions = computed(() => {
  return summary.value.recentTransactions.filter((item) => {
    const paid = isPaidTransaction(item)
    if (recentSpendFilter.value === 'paid') return paid
    if (recentSpendFilter.value === 'free') return item.isFree
    return true
  })
})

const yearlyOption = computed<EChartsOption>(() => ({
  color: ['#1d1d1f', '#0071e3'],
  grid: { left: 12, right: 12, top: 28, bottom: 24, containLabel: true },
  tooltip: { trigger: 'axis', valueFormatter: (value) => formatMoney(Number(value)) },
  legend: { top: 0, right: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: '#515154' } },
  xAxis: {
    type: 'category',
    data: summary.value.byYear.map((item) => item.year),
    axisTick: { show: false },
    axisLine: { lineStyle: { color: '#d2d2d7' } },
  },
  yAxis: {
    type: 'value',
    axisLabel: { formatter: (value: number) => value >= 10000 ? `${Math.round(value / 10000)}万` : `${value}` },
    splitLine: { lineStyle: { color: 'rgba(29,29,31,0.08)' } },
  },
  series: [
    {
      name: '硬件',
      type: 'bar',
      stack: 'cash',
      data: summary.value.byYear.map((item) => item.hardware.toNumber()),
      barWidth: 18,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    },
    {
      name: '软件 / 订阅',
      type: 'bar',
      stack: 'cash',
      data: summary.value.byYear.map((item) => item.software.toNumber()),
      barWidth: 18,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    },
  ],
}))

const categoryOption = computed<EChartsOption>(() => ({
  color: ['#1d1d1f', '#0071e3', '#34c759', '#ff9f0a', '#86868b', '#af52de', '#ff3b30'],
  tooltip: { trigger: 'item', valueFormatter: (value) => formatMoney(Number(value)) },
  legend: { bottom: 0, left: 'center', textStyle: { color: '#515154' } },
  series: [
    {
      name: '类别',
      type: 'pie',
      radius: ['58%', '74%'],
      center: ['50%', '42%'],
      avoidLabelOverlap: true,
      label: { show: false },
      labelLine: { show: false },
      data: summary.value.byCategory.slice(0, 8).map((item) => ({ name: item.name, value: item.value.toNumber() })),
    },
  ],
}))

const paymentOption = computed<EChartsOption>(() => ({
  color: ['#0071e3', '#1d1d1f', '#86868b', '#34c759', '#ff9f0a'],
  grid: { left: 12, right: 24, top: 12, bottom: 12, containLabel: true },
  tooltip: { trigger: 'axis', valueFormatter: (value) => formatMoney(Number(value)) },
  xAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: 'rgba(29,29,31,0.08)' } },
    axisLabel: { formatter: (value: number) => value >= 10000 ? `${Math.round(value / 10000)}万` : `${value}` },
  },
  yAxis: {
    type: 'category',
    data: summary.value.byPayment.slice(0, 6).map((item) => item.name),
    axisTick: { show: false },
    axisLine: { show: false },
  },
  series: [
    {
      name: '支付方式',
      type: 'bar',
      data: summary.value.byPayment.slice(0, 6).map((item) => item.value.toNumber()),
      barWidth: 14,
      itemStyle: { borderRadius: 4 },
    },
  ],
}))

function isStoreCreditPayment(paymentMethod?: string): boolean {
  return String(paymentMethod ?? '').toUpperCase().includes('STORE CREDIT')
}

function isPaidTransaction(item: { cashImpact: boolean; paymentMethod?: string; isFree: boolean; amount: string }): boolean {
  if (item.cashImpact) return true
  if (item.isFree) return false
  return isStoreCreditPayment(item.paymentMethod) && Number(item.amount) !== 0
}

function paymentBadge(item: { cashImpact: boolean; paymentMethod?: string; isFree: boolean; amount: string; currency?: string }) {
  if (item.isFree) return { tone: 'default' as const, label: '免费' }
  if (item.cashImpact) return { tone: 'green' as const, label: formatMoney(item.amount, item.currency) }
  if (isStoreCreditPayment(item.paymentMethod) && !item.isFree && Number(item.amount) !== 0) {
    return { tone: 'orange' as const, label: formatMoney(item.amount, item.currency) }
  }
  return { tone: 'orange' as const, label: formatMoney(item.amount, item.currency) }
}
</script>

<template>
  <main>
    <ApplePageHeader
      eyebrow="Dashboard"
      title="你的 Apple 生态真实支出"
      description="以实际现金支出为主口径，分层展示硬件、软件、订阅和 Store Credit 流转。"
    >
      <template #actions>
        <RouterLink to="/import">
          <AppleButton variant="primary">{{ store.hasData ? '重新导入' : '导入 CSV' }}</AppleButton>
        </RouterLink>
      </template>
    </ApplePageHeader>

    <div class="mx-auto space-y-8 px-5 pb-12 md:px-8 lg:max-w-7xl">
      <AppleReveal>
        <AppleCard tone="hero" class="overflow-hidden">
          <div class="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <AppleMetric
              label="这些年在 Apple 生态中的实际现金支出"
              :value="formatSummaryMoney(summary.cashSpend)"
              tone="hero"
              detail="不重复计入 Store Credit 消费，免费 / 限免项目不计入支出，退款按净额扣除。"
            />
            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-md bg-apple-bg p-4">
                <p class="text-sm text-apple-gray">硬件支出</p>
                <p class="mt-2 text-2xl font-semibold">{{ formatSummaryMoney(summary.hardwareSpend) }}</p>
              </div>
              <div class="rounded-md bg-apple-bg p-4">
                <p class="text-sm text-apple-gray">软件 / 订阅</p>
                <p class="mt-2 text-2xl font-semibold">{{ formatSummaryMoney(summary.softwareSpend) }}</p>
              </div>
              <div class="rounded-md bg-apple-bg p-4">
                <p class="text-sm text-apple-gray">账单项目价值</p>
                <p class="mt-2 text-2xl font-semibold">{{ formatSummaryMoney(summary.billValue) }}</p>
              </div>
              <div class="rounded-md bg-apple-bg p-4">
                <p class="text-sm text-apple-gray">免费 / 限免</p>
                <p class="mt-2 text-2xl font-semibold">{{ summary.freeCount }} 项</p>
              </div>
            </div>
          </div>
        </AppleCard>
      </AppleReveal>

      <div v-if="!store.hasData" class="rounded-md border border-apple-line bg-white p-6 text-center">
        <p class="text-lg font-semibold">还没有导入数据</p>
        <p class="mt-2 text-sm text-apple-gray">先导入两个核心 CSV，就可以看到真实统计。</p>
      </div>

      <div class="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <AppleCard>
          <AppleSectionTitle title="年度支出趋势" description="按实际现金支出口径拆分硬件与软件 / 订阅。" />
          <AppleChart :option="yearlyOption" height="360px" />
        </AppleCard>

        <AppleCard>
          <AppleSectionTitle title="类别占比" description="现金支出按交易类别汇总。" />
          <AppleChart :option="categoryOption" height="360px" />
        </AppleCard>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <AppleCard>
          <AppleSectionTitle title="支付方式" description="只统计会影响现金支出的交易。" />
          <AppleChart :option="paymentOption" height="300px" />
        </AppleCard>

        <AppleCard tone="raised">
          <AppleSectionTitle title="Apple Store 充值" description="区分充值、余额消费和当前剩余，避免重复计算。" />
          <div class="grid gap-3 md:grid-cols-3">
            <div class="rounded-[var(--radius-panel)] bg-apple-bg p-4">
              <p class="text-sm text-apple-gray">累计充值</p>
              <p class="mt-2 text-3xl font-semibold">{{ formatSummaryMoney(summary.storeCreditRecharge) }}</p>
            </div>
            <div class="rounded-[var(--radius-panel)] bg-apple-bg p-4">
              <p class="text-sm text-apple-gray">已消费</p>
              <p class="mt-2 text-3xl font-semibold">{{ formatSummaryMoney(summary.storeCreditSpend) }}</p>
            </div>
            <div class="rounded-[var(--radius-panel)] bg-apple-bg p-4">
              <p class="text-sm text-apple-gray">当前余额</p>
              <p class="mt-2 text-3xl font-semibold">{{ formatSummaryMoney(summary.storeCreditBalance) }}</p>
            </div>
          </div>
          <div class="mt-5 rounded-[var(--radius-panel)] border border-apple-line bg-white p-4">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-sm font-medium text-apple-gray">余额使用进度</p>
                <p class="mt-1 text-sm text-[#515154]">已消费 {{ storeCreditSpentRatio.toFixed(1) }}%，剩余 {{ formatSummaryMoney(summary.storeCreditBalance) }}</p>
              </div>
              <AppleDataBadge tone="blue">{{ formatSummaryMoney(summary.storeCreditSpend) }} / {{ formatSummaryMoney(summary.storeCreditRecharge) }}</AppleDataBadge>
            </div>
            <div class="mt-4 h-3 overflow-hidden rounded-full bg-apple-bg">
              <div class="h-full rounded-full bg-apple-blue transition-all duration-500" :style="{ width: `${storeCreditSpentRatio}%` }" />
            </div>
          </div>
        </AppleCard>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <AppleCard>
          <AppleSectionTitle title="最高消费 Top 10" />
          <div class="divide-y divide-apple-line">
            <div v-for="item in summary.topTransactions" :key="item.id" class="flex items-center justify-between gap-4 py-3">
              <div class="min-w-0">
                <p class="truncate font-medium">{{ item.title }}</p>
                <p class="mt-1 text-sm text-apple-gray">{{ item.date }} · {{ item.category }}</p>
              </div>
              <p class="shrink-0 font-semibold">{{ formatMoney(item.amount, item.currency) }}</p>
            </div>
          </div>
        </AppleCard>

        <AppleCard>
          <AppleSectionTitle title="最近消费">
            <AppleSegmentedControl v-model="recentSpendFilter" :options="recentSpendOptions" />
          </AppleSectionTitle>
          <div class="divide-y divide-apple-line">
            <div v-for="item in recentTransactions" :key="item.id" class="flex items-center justify-between gap-4 py-3">
              <div class="min-w-0">
                <p class="truncate font-medium">{{ item.title }}</p>
                <p class="mt-1 text-sm text-apple-gray">{{ item.date }} · {{ item.paymentMethod || 'Unknown' }}</p>
              </div>
              <AppleDataBadge :tone="paymentBadge(item).tone">
                {{ paymentBadge(item).label }}
              </AppleDataBadge>
            </div>
          </div>
          <p v-if="!recentTransactions.length" class="py-3 text-sm text-apple-gray">当前筛选下没有匹配的最近消费记录。</p>
        </AppleCard>
      </div>

      <AppleCard v-if="summary.warnings.length" tone="subtle">
        <AppleSectionTitle title="数据质量提示" />
        <div class="flex flex-wrap gap-2">
          <AppleDataBadge v-for="warning in summary.warnings" :key="warning" tone="orange">{{ warning }}</AppleDataBadge>
        </div>
      </AppleCard>
    </div>
  </main>
</template>
