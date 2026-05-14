<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppleButton from '@/components/ui/AppleButton.vue'
import AppleCard from '@/components/ui/AppleCard.vue'
import AppleDataBadge from '@/components/ui/AppleDataBadge.vue'
import ApplePageHeader from '@/components/ui/ApplePageHeader.vue'
import AppleSegmentedControl from '@/components/ui/AppleSegmentedControl.vue'
import AppleSectionTitle from '@/components/ui/AppleSectionTitle.vue'
import { importAppleCsvFiles } from './import-store'
import { useTransactionStore } from '@/features/transactions/transaction-store'

type ImportMode = 'append' | 'replace'

const store = useTransactionStore()
const selectedFiles = ref<File[]>([])
const importing = ref(false)
const isDragging = ref(false)
const importMode = ref<ImportMode>('append')

const latestBatch = computed(() => store.batches[0])
const lastImportedAt = computed(() => latestBatch.value ? new Date(latestBatch.value.importedAt).toLocaleString() : '尚未导入')
const importModeOptions = [
  { label: '增量导入', value: 'append' },
  { label: '替换全部', value: 'replace' },
] satisfies Array<{ label: string; value: ImportMode }>

function setFiles(fileList: FileList | null) {
  selectedFiles.value = Array.from(fileList ?? []).filter((file) => file.name.toLowerCase().endsWith('.csv'))
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  setFiles(event.dataTransfer?.files ?? null)
}

async function importFiles() {
  if (!selectedFiles.value.length) {
    ElMessage.warning('请选择 Apple 导出的 CSV 文件。')
    return
  }
  importing.value = true
  try {
    const result = await importAppleCsvFiles(selectedFiles.value)
    if (importMode.value === 'replace') {
      await ElMessageBox.confirm('替换全部会清空当前本地数据，再写入本次导入结果。', '确认替换全部数据', {
        confirmButtonText: '替换全部',
        cancelButtonText: '取消',
        type: 'warning',
      })
      result.batch.files = result.batch.files.map((file) => ({
        ...file,
        insertedCount: file.parsedCount,
        duplicateCount: 0,
      }))
      await store.replaceAll(result.transactions, result.assets, result.batch)
      ElMessage.success(`替换完成：${result.transactions.length} 条交易，${result.assets.length} 个资产。`)
    } else {
      const summary = await store.appendImport(result.transactions, result.assets, result.batch, { fileBuckets: result.fileBuckets })
      ElMessage.success(
        `增量导入完成：新增 ${summary.insertedTransactions} 条交易、${summary.insertedAssets} 个资产，跳过重复 ${summary.duplicateTransactions + summary.duplicateAssets} 条。`,
      )
    }
    selectedFiles.value = []
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error instanceof Error ? error.message : '导入失败，请检查 CSV 文件。')
    }
  } finally {
    importing.value = false
  }
}

async function clearData() {
  await ElMessageBox.confirm('清空后会删除本地 IndexedDB 中的交易、资产和导入批次。', '清空本地数据', {
    confirmButtonText: '清空',
    cancelButtonText: '取消',
    type: 'warning',
  })
  await store.clearAll()
  selectedFiles.value = []
  ElMessage.success('本地数据已清空。')
}
</script>

<template>
  <main>
    <ApplePageHeader
      eyebrow="本地优先"
      title="导入 Apple 数据与隐私导出的 CSV"
      description="V1 支持 App Store 购买记录和 Apple Store 硬件订单。文件只在浏览器本地解析，并保存到 IndexedDB。"
    >
      <template #actions>
        <AppleButton variant="danger" :disabled="!store.hasData" @click="clearData">清空本地数据</AppleButton>
      </template>
    </ApplePageHeader>

    <div class="mx-auto grid max-w-7xl gap-6 px-5 pb-12 md:px-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div class="grid gap-3 md:grid-cols-4 lg:col-span-2">
        <AppleCard tone="quiet">
          <p class="text-sm text-apple-gray">本地交易</p>
          <p class="mt-2 text-3xl font-semibold">{{ store.transactions.length }}</p>
        </AppleCard>
        <AppleCard tone="quiet">
          <p class="text-sm text-apple-gray">资产</p>
          <p class="mt-2 text-3xl font-semibold">{{ store.assets.length }}</p>
        </AppleCard>
        <AppleCard tone="quiet">
          <p class="text-sm text-apple-gray">导入批次</p>
          <p class="mt-2 text-3xl font-semibold">{{ store.batches.length }}</p>
        </AppleCard>
        <AppleCard tone="quiet">
          <p class="text-sm text-apple-gray">最近导入</p>
          <p class="mt-3 text-sm font-semibold leading-5">{{ lastImportedAt }}</p>
        </AppleCard>
      </div>

      <AppleCard tone="raised">
        <div class="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-lg font-semibold">导入方式</p>
            <p class="mt-1 text-sm text-apple-gray">默认增量导入，适合软件和硬件 CSV 分开上传。</p>
          </div>
          <AppleSegmentedControl v-model="importMode" :options="importModeOptions" />
        </div>

        <div
          class="flex min-h-72 flex-col items-center justify-center rounded-[var(--radius-panel)] border border-dashed p-8 text-center transition"
          :class="isDragging ? 'border-apple-blue bg-blue-50' : 'border-apple-line bg-apple-card'"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onDrop"
        >
          <p class="text-2xl font-semibold">拖入 CSV 文件</p>
          <p class="mt-3 max-w-xl text-sm leading-6 text-apple-gray">
            支持 `Store Transaction Purchase and Free Apps History.csv` 与 `Online Purchase History.csv`。也可以一次选择两个文件。
          </p>
          <label class="focus-ring mt-6 inline-flex cursor-pointer rounded-md bg-apple-blue px-5 py-3 text-sm font-semibold text-white hover:bg-[#0077ed]">
            选择文件
            <input class="hidden" type="file" accept=".csv,text/csv" multiple @change="setFiles(($event.target as HTMLInputElement).files)" />
          </label>
        </div>

        <div v-if="selectedFiles.length" class="mt-6">
          <AppleSectionTitle title="待导入文件" />
          <div class="space-y-3">
            <div v-for="file in selectedFiles" :key="file.name" class="flex items-center justify-between rounded-md bg-apple-bg px-4 py-3">
              <span class="text-sm font-medium">{{ file.name }}</span>
              <AppleDataBadge>{{ (file.size / 1024).toFixed(1) }} KB</AppleDataBadge>
            </div>
          </div>
          <AppleButton class="mt-5 w-full md:w-auto" variant="primary" :disabled="importing" @click="importFiles">
            {{ importing ? '正在解析...' : importMode === 'append' ? '增量导入' : '替换全部数据' }}
          </AppleButton>
        </div>
      </AppleCard>

      <AppleCard>
        <AppleSectionTitle title="解析规则" description="V1 已内置核心清洗口径。" />
        <div class="space-y-4 text-sm leading-6 text-[#515154]">
          <p>Store Credit 消费不会重复计入实际现金支出，但会进入账单项目价值。</p>
          <p>Invoice Item Total 为 0 的项目会标记为免费 / 限免，默认不计入支出。</p>
          <p>硬件订单会跳过空白汇总行，并按订单号、行号、描述、含税价格去重。</p>
          <p>所有金额聚合使用 decimal.js，避免浮点累计误差。</p>
        </div>
      </AppleCard>

      <AppleCard v-if="latestBatch" class="lg:col-span-2">
        <AppleSectionTitle title="最近一次导入" :description="new Date(latestBatch.importedAt).toLocaleString()" />
        <div class="grid gap-3 md:grid-cols-2">
          <div v-for="file in latestBatch.files" :key="file.path" class="rounded-md border border-apple-line bg-apple-card p-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="font-semibold">{{ file.path }}</p>
                <p class="mt-1 text-sm text-apple-gray">{{ file.type }}</p>
              </div>
              <AppleDataBadge tone="blue">{{ file.insertedCount ?? file.parsedCount }} 条新增</AppleDataBadge>
            </div>
            <p class="mt-3 text-sm text-[#515154]">
              总行数 {{ file.rowCount }}，解析 {{ file.parsedCount }}，跳过 {{ file.skippedCount }}，重复 {{ file.duplicateCount ?? 0 }}。
            </p>
          </div>
        </div>

        <div v-if="latestBatch.warnings.length" class="mt-5 rounded-md bg-apple-bg p-4">
          <p class="font-semibold">数据质量提示</p>
          <ul class="mt-2 space-y-2 text-sm leading-6 text-[#515154]">
            <li v-for="warning in latestBatch.warnings" :key="`${warning.filePath}-${warning.rowNumber}-${warning.message}`">
              {{ warning.filePath ? `${warning.filePath}: ` : '' }}{{ warning.message }}
            </li>
          </ul>
        </div>
      </AppleCard>
    </div>
  </main>
</template>
