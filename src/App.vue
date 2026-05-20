<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useTransactionStore } from '@/features/transactions/transaction-store'

const route = useRoute()
const store = useTransactionStore()

const primaryNavItems = [
  { path: '/dashboard', label: '总览' },
  { path: '/ledger', label: '明细' },
  { path: '/assets', label: '资产' },
  { path: '/import', label: '导入' },
]

const secondaryNavItems = [
  { path: '/store-credit', label: '余额' },
  { path: '/subscriptions', label: '订阅' },
  { path: '/reports', label: '报告' },
  { path: '/data-quality', label: '质量' },
  { path: '/settings/rules', label: '规则' },
]

onMounted(() => {
  void store.loadFromStorage()
})
</script>

<template>
  <div class="min-h-screen bg-apple-bg text-apple-black">
    <header class="sticky top-0 z-30 border-b border-apple-line bg-white/82 backdrop-blur-xl">
      <div class="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-3 md:px-8 lg:flex-row lg:items-center lg:justify-between">
        <RouterLink to="/dashboard" class="group flex items-center gap-3 focus-ring rounded-md">
          <span class="grid h-8 w-8 place-items-center rounded-md bg-apple-black text-sm font-semibold text-white">A</span>
          <span class="hidden text-sm font-semibold md:inline">Apple 消费账本</span>
        </RouterLink>

        <nav class="flex flex-wrap items-center gap-2">
          <div class="flex items-center gap-1 rounded-md bg-apple-bg p-1">
            <RouterLink
              v-for="item in primaryNavItems"
              :key="item.path"
              :to="item.path"
              class="rounded-md px-3 py-2 text-sm font-medium text-apple-gray transition hover:text-apple-black focus-ring"
              :class="{ 'bg-white text-apple-black shadow-apple-soft': route.path === item.path }"
            >
              {{ item.label }}
            </RouterLink>
          </div>
          <div class="flex items-center gap-1 rounded-md border border-apple-line bg-white p-1">
          <RouterLink
            v-for="item in secondaryNavItems"
            :key="item.path"
            :to="item.path"
            class="rounded-md px-3 py-2 text-sm font-medium text-apple-gray transition hover:text-apple-black focus-ring"
            :class="{ 'bg-white text-apple-black shadow-apple-soft': route.path === item.path }"
          >
            {{ item.label }}
          </RouterLink>
          </div>
        </nav>
      </div>
    </header>

    <RouterView />
  </div>
</template>
