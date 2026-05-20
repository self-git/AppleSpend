<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import AppleButton from '@/components/ui/AppleButton.vue'
import AppleCard from '@/components/ui/AppleCard.vue'
import AppleDataBadge from '@/components/ui/AppleDataBadge.vue'
import AppleMetric from '@/components/ui/AppleMetric.vue'
import ApplePageHeader from '@/components/ui/ApplePageHeader.vue'
import AppleSectionTitle from '@/components/ui/AppleSectionTitle.vue'
import type { AppleAssetCategory, AppleRetailPlatform } from '@/features/transactions/transaction-model'
import { useTransactionStore } from '@/features/transactions/transaction-store'
import { formatMoney, parseMoney } from '@/lib/money'
import { parseExternalRetailPdf } from './parse-retail-pdf'
import type { ExternalRetailImportDraft } from './external-retail-model'
import { createExternalRetailImportPayload, platformLabel } from './external-retail-to-ledger'

const store = useTransactionStore()
const drafts = ref<ExternalRetailImportDraft[]>([])
const parseMessages = ref<string[]>([])
const parsing = ref(false)
const importing = ref(false)

const categoryOptions: AppleAssetCategory[] = ['iPhone', 'iPad', 'Mac', 'Apple Watch', 'AirPods', 'AppleCare', 'Accessory', 'Software', 'Other']
const platformOptions: Array<{ label: string; value: AppleRetailPlatform }> = [
  { label: '京东', value: 'jd' },
  { label: '天猫', value: 'tmall' },
  { label: '淘宝', value: 'taobao' },
  { label: 'Apple Store', value: 'apple_store' },
  { label: '其他', value: 'other' },
]

const totalCash = computed(() => drafts.value.reduce((total, draft) => total.plus(parseMoney(draft.cashAmount)), parseMoney(0)))
const totalBillValue = computed(() => drafts.value.reduce((total, draft) => total.plus(parseMoney(draft.billValueAmount || draft.cashAmount)), parseMoney(0)))
const fingerprintCount = computed(() => drafts.value.filter((draft) => draft.deviceFingerprint).length)

async function setFiles(fileList: FileList | null) {
  const files = Array.from(fileList ?? []).filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
  if (!files.length) {
    ElMessage.warning('请选择电子发票 PDF 文件。')
    return
  }

  parsing.value = true
  parseMessages.value = []

  try {
    for (const file of files) {
      const result = await parseExternalRetailPdf(file)
      parseMessages.value.push(...result.warnings.map((message) => `${file.name}: ${message}`))
      if (result.draft) {
        drafts.value.push(withExistingDuplicateWarnings(result.draft))
      }
    }
    if (drafts.value.length) ElMessage.success(`已生成 ${drafts.value.length} 条待确认草稿。`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    parseMessages.value.push(`解析失败：${message}`)
    ElMessage.error('发票解析失败，请检查 PDF 是否可复制文本。')
  } finally {
    parsing.value = false
  }
}

function withExistingDuplicateWarnings(draft: ExternalRetailImportDraft): ExternalRetailImportDraft {
  if (!draft.deviceFingerprint) return draft
  const exists = store.assets.some((asset) => asset.deviceFingerprint === draft.deviceFingerprint)
  return exists ? { ...draft, warnings: [...draft.warnings, '已有资产使用同一设备识别短码，导入后会作为疑似重复提示。'], confidence: 'medium' } : draft
}

function removeDraft(index: number) {
  drafts.value.splice(index, 1)
}

function clearDrafts() {
  drafts.value = []
  parseMessages.value = []
}

async function confirmImport() {
  if (!drafts.value.length) {
    ElMessage.warning('没有可导入的草稿。')
    return
  }

  importing.value = true
  try {
    const { payload, fileBuckets } = createExternalRetailImportPayload(drafts.value)
    const summary = await store.appendImport(payload, { fileBuckets })
    ElMessage.success(`导入完成：新增 ${summary.insertedTransactions} 条交易、${summary.insertedAssets} 个资产。`)
    clearDrafts()
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <main>
    <ApplePageHeader
      eyebrow="外部发票"
      title="导入京东、天猫和其他平台的 Apple 设备"
      description="电子发票 PDF 会先在本地解析为草稿。SN / IMEI 只生成不可逆短码，原文不会写入账本。"
    >
      <template #actions>
        <AppleButton :disabled="!drafts.length || importing" variant="primary" @click="confirmImport">
          {{ importing ? '正在导入...' : '确认导入' }}
        </AppleButton>
        <AppleButton :disabled="!drafts.length || importing" @click="clearDrafts">清空草稿</AppleButton>
      </template>
    </ApplePageHeader>

    <div class="mx-auto space-y-8 px-5 pb-12 md:px-8 lg:max-w-7xl">
      <AppleCard tone="raised">
        <div class="grid gap-5 md:grid-cols-4">
          <AppleMetric label="待确认草稿" :value="`${drafts.length} 条`" tone="quiet" />
          <AppleMetric label="现金支出" :value="formatMoney(totalCash)" tone="quiet" />
          <AppleMetric label="票面价值" :value="formatMoney(totalBillValue)" tone="quiet" />
          <AppleMetric label="设备短码" :value="`${fingerprintCount} 条`" tone="quiet" />
        </div>

        <div
          class="mt-6 rounded-[var(--radius-panel)] border border-dashed border-apple-line bg-apple-card p-8 text-center transition hover:border-apple-blue"
        >
          <p class="text-2xl font-semibold">上传电子发票 PDF</p>
          <p class="mx-auto mt-3 max-w-2xl text-sm leading-6 text-apple-gray">
            当前版本只处理可复制文本的电子发票 PDF。扫描件、订单截图和 OCR 会在后续阶段接入。
          </p>
          <label class="focus-ring mt-6 inline-flex cursor-pointer rounded-md bg-apple-blue px-5 py-3 text-sm font-semibold text-white hover:bg-[#0077ed]">
            {{ parsing ? '正在解析...' : '选择 PDF' }}
            <input class="hidden" type="file" accept=".pdf,application/pdf" multiple :disabled="parsing" @change="setFiles(($event.target as HTMLInputElement).files)" />
          </label>
        </div>
      </AppleCard>

      <AppleCard v-if="parseMessages.length" tone="subtle">
        <AppleSectionTitle title="解析提示" />
        <div class="flex flex-wrap gap-2">
          <AppleDataBadge v-for="message in parseMessages" :key="message" tone="orange">{{ message }}</AppleDataBadge>
        </div>
      </AppleCard>

      <AppleCard v-if="!drafts.length">
        <AppleSectionTitle title="还没有草稿" description="选择京东、天猫、淘宝或其他平台开具的电子发票 PDF 后，这里会显示导入预览。" />
      </AppleCard>

      <div v-else class="space-y-5">
        <AppleCard v-for="(draft, index) in drafts" :key="draft.id" tone="media">
          <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <AppleDataBadge :tone="draft.confidence === 'high' ? 'green' : 'orange'">{{ draft.confidence === 'high' ? '高置信度' : '需确认' }}</AppleDataBadge>
                <AppleDataBadge tone="blue">{{ platformLabel(draft.platform) }}</AppleDataBadge>
                <AppleDataBadge v-if="draft.deviceFingerprint">{{ draft.deviceFingerprint }}</AppleDataBadge>
              </div>
              <h2 class="mt-3 text-2xl font-semibold">{{ draft.productName }}</h2>
              <p class="mt-2 text-sm text-apple-gray">{{ draft.sourceFileName }}</p>
            </div>
            <AppleButton variant="danger" @click="removeDraft(index)">忽略此发票</AppleButton>
          </div>

          <div class="mt-6 grid gap-4 lg:grid-cols-3">
            <div class="space-y-3">
              <p class="text-sm font-semibold text-apple-gray">商品信息</p>
              <el-input v-model="draft.productName" placeholder="商品名称" />
              <div class="grid gap-3 md:grid-cols-2">
                <el-input v-model="draft.modelCode" placeholder="规格型号" />
                <el-select v-model="draft.category" placeholder="类别">
                  <el-option v-for="category in categoryOptions" :key="category" :label="category" :value="category" />
                </el-select>
              </div>
            </div>

            <div class="space-y-3">
              <p class="text-sm font-semibold text-apple-gray">金额与日期</p>
              <div class="grid gap-3 md:grid-cols-2">
                <el-input v-model="draft.cashAmount" placeholder="现金支出" />
                <el-input v-model="draft.billValueAmount" placeholder="票面价值" />
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <el-input v-model="draft.subsidyAmount" placeholder="补贴金额" />
                <el-input v-model="draft.invoiceDate" placeholder="开票日期 YYYY-MM-DD" />
              </div>
            </div>

            <div class="space-y-3">
              <p class="text-sm font-semibold text-apple-gray">渠道与凭证</p>
              <div class="grid gap-3 md:grid-cols-2">
                <el-select v-model="draft.platform" placeholder="平台">
                  <el-option v-for="platform in platformOptions" :key="platform.value" :label="platform.label" :value="platform.value" />
                </el-select>
                <el-input v-model="draft.sellerName" placeholder="销售方" />
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <el-input v-model="draft.orderNumber" placeholder="订单号" />
                <el-input v-model="draft.invoiceNumber" placeholder="发票号码" />
              </div>
            </div>
          </div>

          <div class="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div class="rounded-[var(--radius-panel)] bg-apple-bg p-4">
              <p class="text-sm font-semibold text-apple-gray">隐私识别短码</p>
              <div class="mt-3 space-y-2 text-sm">
                <p>主短码：{{ draft.deviceFingerprint || '未生成' }}</p>
                <p>SN：{{ draft.snFingerprint || '未生成' }}</p>
                <p>IMEI：{{ draft.imeiFingerprints.length ? draft.imeiFingerprints.join('、') : '未生成' }}</p>
              </div>
            </div>
            <div class="rounded-[var(--radius-panel)] bg-apple-bg p-4">
              <p class="text-sm font-semibold text-apple-gray">提示</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <AppleDataBadge v-for="warning in draft.warnings" :key="warning" tone="orange">{{ warning }}</AppleDataBadge>
                <AppleDataBadge v-if="!draft.warnings.length" tone="green">字段完整</AppleDataBadge>
              </div>
            </div>
          </div>
        </AppleCard>
      </div>
    </div>
  </main>
</template>
