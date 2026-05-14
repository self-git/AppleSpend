<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import AppleAssetImage from '@/components/media/AppleAssetImage.vue'
import AppleButton from '@/components/ui/AppleButton.vue'
import AppleCard from '@/components/ui/AppleCard.vue'
import AppleDataBadge from '@/components/ui/AppleDataBadge.vue'
import AppleImageHero from '@/components/media/AppleImageHero.vue'
import ApplePageHeader from '@/components/ui/ApplePageHeader.vue'
import AppleSegmentedControl from '@/components/ui/AppleSegmentedControl.vue'
import AppleSectionTitle from '@/components/ui/AppleSectionTitle.vue'
import type { AppleTransaction } from '@/features/transactions/transaction-model'
import { useTransactionStore } from '@/features/transactions/transaction-store'
import { toCsv } from '@/lib/csv'
import { formatMoney, parseMoney } from '@/lib/money'
import { resolveTransactionImage } from '@/features/media-assets/image-resolver'

type SpendFilter = 'all' | 'paid' | 'free'

const store = useTransactionStore()
const keyword = ref('')
const selectedYear = ref('')
const selectedCategory = ref('')
const selectedSource = ref('')
const selectedPayment = ref('')
const spendFilter = ref<SpendFilter>('all')
const selectedTransaction = ref<AppleTransaction>()
const drawerVisible = ref(false)

const spendOptions = [
  { label: '全部', value: 'all' },
  { label: '付费', value: 'paid' },
  { label: '免费', value: 'free' },
] satisfies Array<{ label: string; value: SpendFilter }>

const filteredTransactions = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return store.transactions.filter((item) => {
    if (query && !`${item.title} ${item.subtitle ?? ''} ${item.orderNumber ?? ''}`.toLowerCase().includes(query)) return false
    if (selectedYear.value && !item.date.startsWith(selectedYear.value)) return false
    if (selectedCategory.value && item.category !== selectedCategory.value) return false
    if (selectedSource.value && item.source !== selectedSource.value) return false
    if (selectedPayment.value && item.paymentMethod !== selectedPayment.value) return false
    if (spendFilter.value === 'paid' && !isPaidTransaction(item)) return false
    if (spendFilter.value === 'free' && !item.isFree) return false
    return true
  })
})

function sourceLabel(source: string): string {
  const labels: Record<string, string> = {
    apple_store: 'Apple Store',
    app_store: 'App Store',
    subscription: '订阅',
    store_credit: 'Store Credit',
    applecare: 'AppleCare',
  }
  return labels[source] ?? source
}

function openDetail(transaction: AppleTransaction) {
  selectedTransaction.value = transaction
  drawerVisible.value = true
}

function sortAmount(a: AppleTransaction, b: AppleTransaction) {
  return parseMoney(a.amount).cmp(parseMoney(b.amount))
}

function isStoreCreditPayment(paymentMethod?: string): boolean {
  return String(paymentMethod ?? '').toUpperCase().includes('STORE CREDIT')
}

function isPaidTransaction(transaction: AppleTransaction): boolean {
  if (transaction.cashImpact) return true
  if (transaction.isFree) return false
  return isStoreCreditPayment(transaction.paymentMethod)
}

function amountBadge(transaction: AppleTransaction) {
  if (transaction.isFree) return { tone: 'default' as const, label: '免费' }
  if (transaction.cashImpact) return { tone: 'green' as const, label: formatMoney(transaction.amount, transaction.currency) }
  if (isStoreCreditPayment(transaction.paymentMethod)) {
    return { tone: 'orange' as const, label: formatMoney(transaction.amount, transaction.currency) }
  }
  return { tone: 'orange' as const, label: formatMoney(transaction.amount, transaction.currency) }
}

function exportCsv() {
  if (!filteredTransactions.value.length) {
    ElMessage.warning('当前筛选结果为空。')
    return
  }
  const csv = toCsv(
    filteredTransactions.value.map((item) => ({
      date: item.date,
      source: sourceLabel(item.source),
      category: item.category,
      title: item.title,
      subtitle: item.subtitle ?? '',
      amount: item.amount,
      currency: item.currency,
      paymentMethod: item.paymentMethod ?? '',
      orderNumber: item.orderNumber ?? '',
      cashImpact: String(item.cashImpact),
      billValueImpact: String(item.billValueImpact),
      isFree: String(item.isFree),
      isRefund: String(item.isRefund),
    })),
  )
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'apple-ledger-filtered.csv'
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <main>
    <ApplePageHeader
      eyebrow="Ledger"
      title="像查账一样查看每一笔 Apple 消费"
      description="主表保持干净，原始 CSV 字段放在详情抽屉中，便于回溯和排查。"
    >
      <template #actions>
        <AppleButton :disabled="!filteredTransactions.length" @click="exportCsv">导出当前筛选</AppleButton>
      </template>
    </ApplePageHeader>

    <div class="mx-auto space-y-6 px-5 pb-12 md:px-8 lg:max-w-7xl">
      <AppleCard>
        <div class="grid gap-4 lg:grid-cols-[1.2fr_repeat(4,0.7fr)]">
          <el-input v-model="keyword" clearable placeholder="搜索名称、服务、订单号" />
          <el-select v-model="selectedYear" clearable placeholder="年份">
            <el-option v-for="year in store.years" :key="year" :label="year" :value="year" />
          </el-select>
          <el-select v-model="selectedCategory" clearable placeholder="类别">
            <el-option v-for="category in store.categories" :key="category" :label="category" :value="category" />
          </el-select>
          <el-select v-model="selectedSource" clearable placeholder="来源">
            <el-option v-for="source in store.sources" :key="source" :label="sourceLabel(source)" :value="source" />
          </el-select>
          <el-select v-model="selectedPayment" clearable placeholder="支付方式">
            <el-option v-for="method in store.paymentMethods" :key="method" :label="method" :value="method" />
          </el-select>
        </div>
        <div class="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <AppleSegmentedControl v-model="spendFilter" :options="spendOptions" />
          <p class="text-sm text-apple-gray">当前 {{ filteredTransactions.length }} 条 / 全部 {{ store.transactions.length }} 条</p>
        </div>
      </AppleCard>

      <AppleCard class="hidden md:block" :padded="false">
        <el-table class="apple-ledger-table" :data="filteredTransactions" row-key="id" @row-click="openDetail">
          <el-table-column label="" width="86">
            <template #default="{ row }">
              <AppleAssetImage :asset="resolveTransactionImage(row)" size="sm" />
            </template>
          </el-table-column>
          <el-table-column prop="date" label="日期" width="118" sortable />
          <el-table-column label="名称" min-width="280">
            <template #default="{ row }">
              <div>
                <p class="font-semibold text-apple-black">{{ row.title }}</p>
                <p class="mt-1 text-sm text-apple-gray">{{ sourceLabel(row.source) }}{{ row.subtitle ? ` · ${row.subtitle}` : '' }}</p>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="category" label="类别" width="130" />
          <el-table-column prop="paymentMethod" label="支付方式" width="120" />
          <el-table-column label="金额" width="210" sortable :sort-method="sortAmount">
            <template #default="{ row }">
              <div class="flex items-center gap-1.5 whitespace-nowrap">
                <AppleDataBadge :tone="amountBadge(row).tone">
                  {{ amountBadge(row).label }}
                </AppleDataBadge>
                <AppleDataBadge v-if="row.isRefund" tone="red">退款</AppleDataBadge>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </AppleCard>

      <div class="space-y-3 md:hidden">
        <button
          v-for="item in filteredTransactions"
          :key="item.id"
          type="button"
          class="focus-ring w-full rounded-md border border-apple-line bg-white p-4 text-left"
          @click="openDetail(item)"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex min-w-0 gap-3">
              <AppleAssetImage :asset="resolveTransactionImage(item)" size="sm" />
              <div class="min-w-0">
                <p class="truncate font-semibold">{{ item.title }}</p>
                <p class="mt-1 text-sm text-apple-gray">{{ item.date }} · {{ sourceLabel(item.source) }}</p>
              </div>
            </div>
            <span class="shrink-0 font-semibold">{{ formatMoney(item.amount, item.currency) }}</span>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <AppleDataBadge>{{ item.category }}</AppleDataBadge>
            <AppleDataBadge :tone="amountBadge(item).tone">
              {{ amountBadge(item).label }}
            </AppleDataBadge>
            <AppleDataBadge v-if="item.isRefund" tone="red">退款</AppleDataBadge>
          </div>
        </button>
      </div>

      <AppleCard v-if="!filteredTransactions.length">
        <AppleSectionTitle title="没有匹配记录" description="调整筛选条件，或先到导入页上传 CSV。" />
      </AppleCard>
    </div>

    <el-drawer v-model="drawerVisible" size="min(560px, 92vw)" title="交易详情">
      <div v-if="selectedTransaction" class="space-y-6">
        <AppleImageHero
          :asset="resolveTransactionImage(selectedTransaction)"
          :title="selectedTransaction.title"
          :subtitle="`${selectedTransaction.date} · ${sourceLabel(selectedTransaction.source)}`"
        />
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-md bg-apple-bg p-4">
            <p class="text-sm text-apple-gray">金额</p>
            <p class="mt-1 text-xl font-semibold">{{ formatMoney(selectedTransaction.amount, selectedTransaction.currency) }}</p>
          </div>
          <div class="rounded-md bg-apple-bg p-4">
            <p class="text-sm text-apple-gray">支付方式</p>
            <p class="mt-1 text-xl font-semibold">{{ selectedTransaction.paymentMethod || 'Unknown' }}</p>
          </div>
        </div>
        <div>
          <p class="font-semibold">原始 CSV 字段</p>
          <div class="mt-3 max-h-[48vh] overflow-auto rounded-md border border-apple-line">
            <dl class="divide-y divide-apple-line">
              <div v-for="[key, value] in Object.entries(selectedTransaction.raw)" :key="key" class="grid grid-cols-[0.9fr_1.1fr] gap-3 px-4 py-3 text-sm">
                <dt class="font-medium text-apple-gray">{{ key }}</dt>
                <dd class="break-words text-apple-black">{{ value || '-' }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </el-drawer>
  </main>
</template>
