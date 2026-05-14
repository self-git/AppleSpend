<script setup lang="ts">
import type { AppleVisualAsset } from '@/features/media-assets/asset-image-model'

defineProps<{
  asset: AppleVisualAsset
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div class="overflow-hidden rounded-[var(--radius-card)] bg-apple-bg">
    <div class="grid min-h-64 place-items-center">
      <img :src="asset.image" :alt="title" class="max-h-56 w-full object-contain p-8 animate-[imageSettle_420ms_var(--ease-apple)_both]" />
    </div>
    <div class="border-t border-apple-line bg-white/72 px-6 py-5 backdrop-blur">
      <p class="text-2xl font-semibold leading-tight">{{ title }}</p>
      <p v-if="subtitle" class="mt-2 text-sm leading-6 text-apple-gray">{{ subtitle }}</p>
    </div>
  </div>
</template>
