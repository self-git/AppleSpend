<script setup lang="ts">
import Decimal from 'decimal.js'
import { computed, ref } from 'vue'
import AppleAssetImage from '@/components/media/AppleAssetImage.vue'
import AppleCard from '@/components/ui/AppleCard.vue'
import AppleDataBadge from '@/components/ui/AppleDataBadge.vue'
import AppleMetric from '@/components/ui/AppleMetric.vue'
import ApplePageHeader from '@/components/ui/ApplePageHeader.vue'
import AppleSegmentedControl from '@/components/ui/AppleSegmentedControl.vue'
import AppleSectionTitle from '@/components/ui/AppleSectionTitle.vue'
import type { AppleAsset, AppleAssetCategory } from '@/features/transactions/transaction-model'
import { useTransactionStore } from '@/features/transactions/transaction-store'
import { humanDurationSince } from '@/lib/date'
import { formatMoney, parseMoney } from '@/lib/money'
import { resolveAssetImage } from '@/features/media-assets/image-resolver'

const store = useTransactionStore()
const selectedCategory = ref<AppleAssetCategory | 'All'>('All')

const categories = computed(() => {
  const values = Array.from(new Set(store.assets.map((asset) => asset.category)))
  return [
    { label: '全部', value: 'All' as const },
    ...values.map((value) => ({ label: value, value })),
  ]
})

const filteredAssets = computed(() =>
  selectedCategory.value === 'All' ? store.assets : store.assets.filter((asset) => asset.category === selectedCategory.value),
)

const totalAssetValue = computed(() => store.assets.reduce((total, item) => total.plus(parseMoney(item.purchasePrice)), new Decimal(0)))

function monthlyCost(asset: AppleAsset): string {
  const price = parseMoney(asset.purchasePrice)
  const date = new Date(asset.purchaseDate)
  if (Number.isNaN(date.getTime())) return '未知'
  const months = Math.max((Date.now() - date.getTime()) / 1000 / 60 / 60 / 24 / 30.4, 1)
  return formatMoney(price.div(months), asset.currency)
}

function statusLabel(status: AppleAsset['status']): string {
  const labels: Record<AppleAsset['status'], string> = {
    using: '使用中',
    sold: '已出售',
    retired: '已闲置',
    gifted: '已送人',
    unknown: '未知',
  }
  return labels[status]
}

</script>

<template>
  <main>
    <ApplePageHeader
      eyebrow="Assets"
      title="你的 Apple 设备资产历史"
      description="V1 会从 Apple Store 硬件订单自动生成资产卡片，并支持维护本地使用状态。"
    />

    <div class="mx-auto space-y-8 px-5 pb-12 md:px-8 lg:max-w-7xl">
      <AppleCard tone="raised">
        <div class="grid gap-5 md:grid-cols-3">
          <AppleMetric label="资产数量" :value="`${store.assets.length} 件`" tone="quiet" />
          <AppleMetric label="订单资产总额" :value="formatMoney(totalAssetValue)" tone="quiet" />
          <AppleMetric label="分类数量" :value="`${categories.length - 1} 类`" tone="quiet" />
        </div>
      </AppleCard>

      <div class="flex overflow-x-auto pb-1">
        <AppleSegmentedControl v-model="selectedCategory" :options="categories" />
      </div>

      <div v-if="filteredAssets.length" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AppleCard v-for="asset in filteredAssets" :key="asset.id" tone="media" class="min-h-[360px]">
          <div class="flex h-full flex-col">
            <AppleAssetImage :asset="resolveAssetImage(asset)" size="lg" />
            <div class="mt-6 flex-1">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xl font-semibold leading-snug">{{ asset.name }}</p>
                  <p class="mt-2 text-sm text-apple-gray">{{ asset.category }} · {{ asset.purchaseDate }}</p>
                </div>
                <AppleDataBadge>{{ statusLabel(asset.status) }}</AppleDataBadge>
              </div>
              <div class="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div class="rounded-md bg-apple-bg p-3">
                  <p class="text-apple-gray">购买价格</p>
                  <p class="mt-1 font-semibold">{{ formatMoney(asset.purchasePrice, asset.currency) }}</p>
                </div>
                <div class="rounded-md bg-apple-bg p-3">
                  <p class="text-apple-gray">使用时长</p>
                  <p class="mt-1 font-semibold">{{ humanDurationSince(asset.purchaseDate) }}</p>
                </div>
                <div class="rounded-md bg-apple-bg p-3">
                  <p class="text-apple-gray">月均成本</p>
                  <p class="mt-1 font-semibold">{{ monthlyCost(asset) }}</p>
                </div>
                <div class="rounded-md bg-apple-bg p-3">
                  <p class="text-apple-gray">订单号</p>
                  <p class="mt-1 truncate font-semibold">{{ asset.orderNumber || '未知' }}</p>
                </div>
              </div>
            </div>
            <el-select class="mt-5" :model-value="asset.status" @change="store.updateAssetStatus(asset.id, $event)">
              <el-option label="使用中" value="using" />
              <el-option label="已出售" value="sold" />
              <el-option label="已闲置" value="retired" />
              <el-option label="已送人" value="gifted" />
              <el-option label="未知" value="unknown" />
            </el-select>
          </div>
        </AppleCard>
      </div>

      <AppleCard v-else>
        <AppleSectionTitle title="还没有资产" description="导入 Online Purchase History.csv 后，这里会出现从硬件订单生成的设备资产。" />
      </AppleCard>
    </div>
  </main>
</template>
