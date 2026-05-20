<script setup lang="ts">
import { computed, ref } from 'vue'
import AppleButton from '@/components/ui/AppleButton.vue'
import AppleCard from '@/components/ui/AppleCard.vue'
import AppleDataBadge from '@/components/ui/AppleDataBadge.vue'
import ApplePageHeader from '@/components/ui/ApplePageHeader.vue'
import AppleSectionTitle from '@/components/ui/AppleSectionTitle.vue'
import { useTransactionStore } from '@/features/transactions/transaction-store'

const store = useTransactionStore()
const severity = ref<'all' | 'info' | 'warning' | 'error'>('all')
const type = ref<'all' | string>('all')

const issueTypes = computed(() => Array.from(new Set(store.dataQualityIssues.map((item) => item.type))).sort())
const filteredIssues = computed(() =>
  store.dataQualityIssues.filter((item) => {
    if (severity.value !== 'all' && item.severity !== severity.value) return false
    if (type.value !== 'all' && item.type !== type.value) return false
    return true
  }),
)

function badgeTone(value: 'info' | 'warning' | 'error') {
  if (value === 'error') return 'red'
  if (value === 'warning') return 'orange'
  return 'blue'
}
</script>

<template>
  <main>
    <ApplePageHeader
      eyebrow="Data Quality"
      title="把异常留在台面上"
      description="所有新导入的数据源都会给出可解释的问题清单，而不是静默吞掉。"
    />

    <div class="mx-auto space-y-8 px-5 pb-12 md:px-8 lg:max-w-7xl">
      <AppleCard tone="raised">
        <div class="grid gap-4 md:grid-cols-3">
          <div class="rounded-[var(--radius-panel)] bg-apple-bg p-4">
            <p class="text-sm text-apple-gray">待处理问题</p>
            <p class="mt-2 text-3xl font-semibold">{{ store.activeIssueCount }}</p>
          </div>
          <div class="rounded-[var(--radius-panel)] bg-apple-bg p-4">
            <p class="text-sm text-apple-gray">警告</p>
            <p class="mt-2 text-3xl font-semibold">{{ store.dataQualityIssues.filter((item) => item.severity === 'warning' && !item.dismissed).length }}</p>
          </div>
          <div class="rounded-[var(--radius-panel)] bg-apple-bg p-4">
            <p class="text-sm text-apple-gray">错误</p>
            <p class="mt-2 text-3xl font-semibold">{{ store.dataQualityIssues.filter((item) => item.severity === 'error' && !item.dismissed).length }}</p>
          </div>
        </div>
      </AppleCard>

      <AppleCard>
        <div class="grid gap-4 md:grid-cols-2">
          <el-select v-model="severity" placeholder="严重程度">
            <el-option label="全部严重程度" value="all" />
            <el-option label="info" value="info" />
            <el-option label="warning" value="warning" />
            <el-option label="error" value="error" />
          </el-select>
          <el-select v-model="type" placeholder="问题类型">
            <el-option label="全部类型" value="all" />
            <el-option v-for="item in issueTypes" :key="item" :label="item" :value="item" />
          </el-select>
        </div>
      </AppleCard>

      <AppleCard>
        <AppleSectionTitle title="问题列表" />
        <div class="space-y-4">
          <div v-for="item in filteredIssues" :key="item.id" class="rounded-md border border-apple-line bg-white p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-semibold">{{ item.title }}</p>
                  <AppleDataBadge :tone="badgeTone(item.severity)">{{ item.severity }}</AppleDataBadge>
                  <AppleDataBadge>{{ item.type }}</AppleDataBadge>
                  <AppleDataBadge v-if="item.dismissed" tone="default">dismissed</AppleDataBadge>
                </div>
                <p class="mt-2 text-sm leading-6 text-[#515154]">{{ item.description }}</p>
                <p v-if="item.suggestedAction" class="mt-2 text-sm text-apple-blue">{{ item.suggestedAction }}</p>
                <p v-if="item.entityIds?.length" class="mt-2 text-xs text-apple-gray">关联记录：{{ item.entityIds.join(', ') }}</p>
              </div>
              <AppleButton :variant="item.dismissed ? 'secondary' : 'text'" @click="store.dismissIssue(item.id, !item.dismissed)">
                {{ item.dismissed ? '恢复' : 'Dismiss' }}
              </AppleButton>
            </div>
          </div>
        </div>
      </AppleCard>
    </div>
  </main>
</template>
