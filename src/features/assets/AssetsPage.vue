<script setup lang="ts">
import Decimal from 'decimal.js'
import { computed, reactive, ref } from 'vue'
import AppleAssetImage from '@/components/media/AppleAssetImage.vue'
import AppleCard from '@/components/ui/AppleCard.vue'
import AppleDataBadge from '@/components/ui/AppleDataBadge.vue'
import AppleMetric from '@/components/ui/AppleMetric.vue'
import ApplePageHeader from '@/components/ui/ApplePageHeader.vue'
import AppleSegmentedControl from '@/components/ui/AppleSegmentedControl.vue'
import AppleSectionTitle from '@/components/ui/AppleSectionTitle.vue'
import type { AppleAssetCategory, AppleDeviceLifecycle } from '@/features/transactions/transaction-model'
import { useTransactionStore } from '@/features/transactions/transaction-store'
import { humanDurationSince } from '@/lib/date'
import { formatMoney, parseMoney } from '@/lib/money'
import { resolveAssetImage } from '@/features/media-assets/image-resolver'
import { buildAssetDetails, type AssetDetailViewModel } from './device-lifecycle-selectors'

const store = useTransactionStore()
const selectedCategory = ref<AppleAssetCategory | 'All'>('All')
const drawerVisible = ref(false)
const selectedDetail = ref<AssetDetailViewModel>()
const lifecycleForm = reactive<AppleDeviceLifecycle>({
  assetId: '',
  status: 'unknown',
  repairEventIds: [],
  supportCaseIds: [],
})

const categories = computed(() => {
  const values = Array.from(new Set(store.assets.map((asset) => asset.category)))
  return [{ label: '全部', value: 'All' as const }, ...values.map((value) => ({ label: value, value }))]
})

const assetDetails = computed(() =>
  buildAssetDetails(
    store.assets,
    store.deviceLifecycles,
    store.repairEvents,
    store.supportCases,
    store.deviceAppearances,
    store.ruleSettings,
  ),
)

const filteredAssets = computed(() =>
  selectedCategory.value === 'All'
    ? assetDetails.value
    : assetDetails.value.filter((asset) => asset.asset.category === selectedCategory.value),
)

const totalAssetValue = computed(() => store.assets.reduce((total, item) => total.plus(parseMoney(item.purchasePrice)), new Decimal(0)))

function openDetail(detail: AssetDetailViewModel) {
  selectedDetail.value = detail
  drawerVisible.value = true
  Object.assign(lifecycleForm, {
    ...detail.lifecycle,
    assetId: detail.asset.id,
    status: detail.lifecycle.status || detail.asset.status,
    repairEventIds: [...detail.lifecycle.repairEventIds],
    supportCaseIds: [...detail.lifecycle.supportCaseIds],
  })
}

async function saveLifecycle() {
  if (!selectedDetail.value) return
  await store.updateAssetStatus(selectedDetail.value.asset.id, lifecycleForm.status)
  await store.upsertDeviceLifecycle({
    ...lifecycleForm,
    assetId: selectedDetail.value.asset.id,
    deviceName: lifecycleForm.deviceName || selectedDetail.value.asset.name,
  })
  selectedDetail.value = assetDetails.value.find((item) => item.asset.id === selectedDetail.value?.asset.id)
}
</script>

<template>
  <main>
    <ApplePageHeader
      eyebrow="Assets"
      title="你的 Apple 设备生命周期"
      description="购买、AppleCare、维修、设备出现记录和出售状态都汇总在同一个资产视图。"
    />

    <div class="mx-auto space-y-8 px-5 pb-12 md:px-8 lg:max-w-7xl">
      <AppleCard tone="raised">
        <div class="grid gap-5 md:grid-cols-4">
          <AppleMetric label="资产数量" :value="`${store.assets.length} 件`" tone="quiet" />
          <AppleMetric label="订单资产总额" :value="formatMoney(totalAssetValue)" tone="quiet" />
          <AppleMetric label="主力设备" :value="`${store.deviceLifecycles.filter((item) => item.isPrimaryDevice).length} 台`" tone="quiet" />
          <AppleMetric label="有维修记录" :value="`${store.repairEvents.length} 条`" tone="quiet" />
        </div>
      </AppleCard>

      <div class="flex overflow-x-auto pb-1">
        <AppleSegmentedControl v-model="selectedCategory" :options="categories" />
      </div>

      <div v-if="filteredAssets.length" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="detail in filteredAssets"
          :key="detail.asset.id"
          type="button"
          class="focus-ring text-left"
          @click="openDetail(detail)"
        >
          <AppleCard tone="media" class="min-h-[380px]">
            <div class="flex h-full flex-col">
              <AppleAssetImage :asset="resolveAssetImage(detail.asset)" size="lg" />
              <div class="mt-6 flex-1">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-xl font-semibold leading-snug">{{ detail.asset.name }}</p>
                    <p class="mt-2 text-sm text-apple-gray">{{ detail.asset.category }} · {{ detail.asset.purchaseDate }}</p>
                  </div>
                  <AppleDataBadge>{{ detail.lifecycle.status }}</AppleDataBadge>
                </div>
                <div class="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div class="rounded-md bg-apple-bg p-3">
                    <p class="text-apple-gray">购买价格</p>
                    <p class="mt-1 font-semibold">{{ formatMoney(detail.asset.purchasePrice, detail.asset.currency) }}</p>
                  </div>
                  <div class="rounded-md bg-apple-bg p-3">
                    <p class="text-apple-gray">持有时长</p>
                    <p class="mt-1 font-semibold">{{ humanDurationSince(detail.asset.purchaseDate) }}</p>
                  </div>
                  <div class="rounded-md bg-apple-bg p-3">
                    <p class="text-apple-gray">净成本</p>
                    <p class="mt-1 font-semibold">{{ formatMoney(detail.netCost, detail.asset.currency) }}</p>
                  </div>
                  <div class="rounded-md bg-apple-bg p-3">
                    <p class="text-apple-gray">最后出现</p>
                    <p class="mt-1 truncate font-semibold">{{ detail.lifecycle.lastSeenDate || detail.appearances[0]?.lastSeenDate || '未知' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </AppleCard>
        </button>
      </div>

      <AppleCard v-else>
        <AppleSectionTitle title="还没有资产" description="导入 Online Purchase History.csv 后，这里会出现设备资产和生命周期信息。" />
      </AppleCard>
    </div>

    <el-drawer v-model="drawerVisible" size="min(720px, 96vw)" title="设备详情">
      <div v-if="selectedDetail" class="space-y-6">
        <div class="grid gap-4 md:grid-cols-3">
          <div class="rounded-md bg-apple-bg p-4">
            <p class="text-sm text-apple-gray">净成本</p>
            <p class="mt-1 text-2xl font-semibold">{{ formatMoney(selectedDetail.netCost, selectedDetail.asset.currency) }}</p>
          </div>
          <div class="rounded-md bg-apple-bg p-4">
            <p class="text-sm text-apple-gray">月均成本</p>
            <p class="mt-1 text-2xl font-semibold">{{ formatMoney(selectedDetail.monthlyCost, selectedDetail.asset.currency) }}</p>
          </div>
          <div class="rounded-md bg-apple-bg p-4">
            <p class="text-sm text-apple-gray">日均成本</p>
            <p class="mt-1 text-2xl font-semibold">{{ formatMoney(selectedDetail.dailyCost, selectedDetail.asset.currency) }}</p>
          </div>
        </div>

        <AppleCard tone="subtle" :interactive="false">
          <AppleSectionTitle title="生命周期维护" description="手动维护出售、主力设备、AppleCare 和备注。" />
          <div class="grid gap-4 md:grid-cols-2">
            <el-select v-model="lifecycleForm.status" placeholder="状态">
              <el-option label="using" value="using" />
              <el-option label="sold" value="sold" />
              <el-option label="retired" value="retired" />
              <el-option label="gifted" value="gifted" />
              <el-option label="lost" value="lost" />
              <el-option label="unknown" value="unknown" />
            </el-select>
            <el-select v-model="lifecycleForm.appleCareStatus" placeholder="AppleCare 状态" clearable>
              <el-option label="covered" value="covered" />
              <el-option label="expired" value="expired" />
              <el-option label="none" value="none" />
              <el-option label="unknown" value="unknown" />
            </el-select>
            <el-input v-model="lifecycleForm.serialNumber" placeholder="序列号" />
            <el-input v-model="lifecycleForm.modelIdentifier" placeholder="型号标识" />
            <el-input v-model="lifecycleForm.soldDate" placeholder="出售日期 YYYY-MM-DD" />
            <el-input v-model="lifecycleForm.soldPrice" placeholder="出售价格" />
            <el-switch v-model="lifecycleForm.isPrimaryDevice" inline-prompt active-text="主力设备" inactive-text="普通设备" />
            <el-input v-model="lifecycleForm.lastSeenDate" placeholder="最后出现日期 YYYY-MM-DD" />
          </div>
          <el-input v-model="lifecycleForm.note" class="mt-4" type="textarea" :rows="3" placeholder="备注" />
          <el-button class="mt-4" type="primary" @click="saveLifecycle">保存生命周期</el-button>
        </AppleCard>

        <div class="grid gap-6 lg:grid-cols-3">
          <AppleCard :interactive="false">
            <AppleSectionTitle title="维修时间线" />
            <div class="space-y-3">
              <div v-for="item in selectedDetail.repairEvents" :key="item.id" class="rounded-md bg-apple-bg p-3">
                <p class="font-medium">{{ item.issue || item.repairStatus || '维修记录' }}</p>
                <p class="mt-1 text-sm text-apple-gray">{{ item.date || '未知日期' }} · {{ item.repairStatus || '未知状态' }}</p>
              </div>
              <p v-if="!selectedDetail.repairEvents.length" class="text-sm text-apple-gray">暂无维修记录。</p>
            </div>
          </AppleCard>
          <AppleCard :interactive="false">
            <AppleSectionTitle title="支持案例" />
            <div class="space-y-3">
              <div v-for="item in selectedDetail.supportCases" :key="item.id" class="rounded-md bg-apple-bg p-3">
                <p class="font-medium">{{ item.issue || item.caseNumber || '支持案例' }}</p>
                <p class="mt-1 text-sm text-apple-gray">{{ item.openedDate || '未知日期' }} · {{ item.status || '未知状态' }}</p>
              </div>
              <p v-if="!selectedDetail.supportCases.length" class="text-sm text-apple-gray">暂无支持案例。</p>
            </div>
          </AppleCard>
          <AppleCard :interactive="false">
            <AppleSectionTitle title="设备出现记录" />
            <div class="space-y-3">
              <div v-for="item in selectedDetail.appearances" :key="item.id" class="rounded-md bg-apple-bg p-3">
                <p class="font-medium">{{ item.deviceName || item.modelIdentifier || '设备记录' }}</p>
                <p class="mt-1 text-sm text-apple-gray">{{ item.lastSeenDate || '未知日期' }} · {{ item.osVersion || '未知系统' }}</p>
              </div>
              <p v-if="!selectedDetail.appearances.length" class="text-sm text-apple-gray">暂无 Apple ID 设备记录。</p>
            </div>
          </AppleCard>
        </div>
      </div>
    </el-drawer>
  </main>
</template>
