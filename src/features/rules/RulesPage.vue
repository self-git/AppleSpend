<script setup lang="ts">
import { reactive, watch } from 'vue'
import AppleButton from '@/components/ui/AppleButton.vue'
import AppleCard from '@/components/ui/AppleCard.vue'
import ApplePageHeader from '@/components/ui/ApplePageHeader.vue'
import AppleSectionTitle from '@/components/ui/AppleSectionTitle.vue'
import { useTransactionStore } from '@/features/transactions/transaction-store'
import { createRuntimeId } from '@/lib/id'
import type { RuleSetting } from '@/features/transactions/transaction-model'

const store = useTransactionStore()
const editableRules = reactive<RuleSetting[]>([])

watch(
  () => store.ruleSettings,
  (value) => {
    editableRules.splice(0, editableRules.length, ...value.map((item) => ({ ...item })))
  },
  { immediate: true },
)

function addRule() {
  editableRules.unshift({
    id: createRuntimeId('rule'),
    type: 'category',
    name: '新规则',
    enabled: true,
    matcher: '',
    value: '',
    note: '',
    updatedAt: new Date().toISOString(),
  })
}

async function saveRules() {
  await store.saveRuleSettings(editableRules.map((item) => ({ ...item, updatedAt: new Date().toISOString() })))
}

async function resetRules() {
  editableRules.splice(0, editableRules.length)
  await store.saveRuleSettings([])
}

function removeRule(id: string) {
  const index = editableRules.findIndex((item) => item.id === id)
  if (index >= 0) editableRules.splice(index, 1)
}

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <main>
    <ApplePageHeader
      eyebrow="Rules"
      title="规则与备份"
      description="把分类、口径和名称归一显式配置出来，同时提供完整备份和脱敏导出。"
    >
      <template #actions>
        <AppleButton variant="secondary" @click="download(store.exportBackup(false), 'apple-ledger-backup.json', 'application/json')">完整备份</AppleButton>
        <AppleButton variant="secondary" @click="download(store.exportBackup(true), 'apple-ledger-backup-redacted.json', 'application/json')">脱敏导出</AppleButton>
      </template>
    </ApplePageHeader>

    <div class="mx-auto space-y-8 px-5 pb-12 md:px-8 lg:max-w-7xl">
      <AppleCard tone="raised">
        <div class="flex flex-wrap gap-3">
          <AppleButton variant="primary" @click="addRule">新增规则</AppleButton>
          <AppleButton variant="secondary" @click="saveRules">保存规则</AppleButton>
          <AppleButton variant="danger" @click="resetRules">恢复默认</AppleButton>
          <AppleButton variant="text" @click="download(JSON.stringify(editableRules, null, 2), 'apple-ledger-rules.json', 'application/json')">导出规则</AppleButton>
        </div>
      </AppleCard>

      <AppleCard>
        <AppleSectionTitle title="用户规则" description="规则在选择器层实时生效，不需要重新导入数据。" />
        <div class="space-y-4">
          <div v-for="rule in editableRules" :key="rule.id" class="rounded-md border border-apple-line bg-white p-4">
            <div class="grid gap-4 md:grid-cols-[0.9fr_0.8fr_1fr_1fr_auto] md:items-center">
              <el-input v-model="rule.name" placeholder="规则名称" />
              <el-select v-model="rule.type">
                <el-option label="category" value="category" />
                <el-option label="cash_flow" value="cash_flow" />
                <el-option label="store_credit" value="store_credit" />
                <el-option label="exclude" value="exclude" />
                <el-option label="subscription_alias" value="subscription_alias" />
                <el-option label="device_alias" value="device_alias" />
              </el-select>
              <el-input v-model="rule.matcher" placeholder="匹配关键字" />
              <el-input v-model="rule.value" placeholder="规则结果 / 目标值" />
              <AppleButton variant="text" @click="removeRule(rule.id)">删除</AppleButton>
            </div>
            <div class="mt-4 grid gap-4 md:grid-cols-[1fr_180px] md:items-center">
              <el-input v-model="rule.note" placeholder="备注，可选" />
              <el-switch v-model="rule.enabled" inline-prompt active-text="启用" inactive-text="停用" />
            </div>
          </div>
        </div>
      </AppleCard>
    </div>
  </main>
</template>
