<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppleButton from '@/components/ui/AppleButton.vue'
import AppleCard from '@/components/ui/AppleCard.vue'
import AppleMetric from '@/components/ui/AppleMetric.vue'
import ApplePageHeader from '@/components/ui/ApplePageHeader.vue'
import AppleSectionTitle from '@/components/ui/AppleSectionTitle.vue'
import { useTransactionStore } from '@/features/transactions/transaction-store'
import { buildYearlyReport, buildYearlyReportMarkdown } from './report-selectors'
import { formatMoney } from '@/lib/money'

const store = useTransactionStore()
const selectedYear = ref('')
const years = computed(() => store.years)

watch(
  years,
  (value) => {
    if (!selectedYear.value && value.length) selectedYear.value = value[0] ?? ''
  },
  { immediate: true },
)

const report = computed(() =>
  selectedYear.value
    ? buildYearlyReport(
        selectedYear.value,
        store.transactions,
        store.assets,
        store.subscriptions,
        store.subscriptionEvents,
        store.storeCreditEntries,
        store.ruleSettings,
      )
    : undefined,
)
const markdown = computed(() => (report.value ? buildYearlyReportMarkdown(report.value) : ''))

function exportMarkdown() {
  if (!markdown.value) return
  const blob = new Blob([markdown.value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `apple-report-${selectedYear.value}.md`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <main>
    <ApplePageHeader
      eyebrow="Reports"
      title="年度 Apple 消费报告"
      description="先把核心统计收敛成 Markdown 报告，确保数字可追溯，再扩展长图和 PDF。"
    >
      <template #actions>
        <AppleButton variant="primary" :disabled="!markdown" @click="exportMarkdown">导出 Markdown</AppleButton>
      </template>
    </ApplePageHeader>

    <div class="mx-auto space-y-8 px-5 pb-12 md:px-8 lg:max-w-7xl">
      <AppleCard>
        <div class="grid gap-4 md:grid-cols-[220px_1fr]">
          <el-select v-model="selectedYear" placeholder="年份">
            <el-option v-for="year in years" :key="year" :label="year" :value="year" />
          </el-select>
          <p class="self-center text-sm text-apple-gray">报告口径基于有效现金支出、余额流水和订阅交易聚合。</p>
        </div>
      </AppleCard>

      <template v-if="report">
        <AppleCard tone="raised">
          <div class="grid gap-4 md:grid-cols-4">
            <AppleMetric label="年度总现金支出" :value="formatMoney(report.cashSpend)" tone="quiet" />
            <AppleMetric label="年度硬件支出" :value="formatMoney(report.hardwareSpend)" tone="quiet" />
            <AppleMetric label="年度订阅支出" :value="formatMoney(report.subscriptionSpend)" tone="quiet" />
            <AppleMetric label="与上一年对比" :value="formatMoney(report.previousYearDelta)" tone="quiet" />
          </div>
        </AppleCard>

        <div class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <AppleCard>
            <AppleSectionTitle title="年度摘要" />
            <div class="space-y-3 text-sm leading-6 text-[#515154]">
              <p>软件 / App 支出：{{ formatMoney(report.softwareSpend) }}</p>
              <p>余额充值：{{ formatMoney(report.storeCreditRecharge) }}</p>
              <p>余额消费：{{ formatMoney(report.storeCreditSpend) }}</p>
              <p>新增设备：{{ report.newDevices.length }} 件</p>
              <p v-if="report.topTransaction">最高单笔消费：{{ report.topTransaction.title }} · {{ formatMoney(report.topTransaction.amount, report.topTransaction.currency) }}</p>
            </div>
          </AppleCard>

          <AppleCard>
            <AppleSectionTitle title="Markdown 预览" />
            <pre class="overflow-auto whitespace-pre-wrap rounded-md bg-apple-bg p-4 text-sm leading-6 text-[#515154]">{{ markdown }}</pre>
          </AppleCard>
        </div>
      </template>
    </div>
  </main>
</template>
