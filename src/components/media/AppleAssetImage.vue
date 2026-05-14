<script setup lang="ts">
import type { AppleVisualAsset } from '@/features/media-assets/asset-image-model'

withDefaults(
  defineProps<{
    asset: AppleVisualAsset
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    size: 'md',
  },
)
</script>

<template>
  <div
    class="group grid shrink-0 place-items-center overflow-hidden rounded-[var(--radius-media)] bg-apple-bg transition duration-[var(--duration-hover)] ease-[var(--ease-apple)]"
    :class="{
      'h-14 w-14': size === 'sm',
      'h-20 w-20': size === 'md',
      'h-36 w-full': size === 'lg',
    }"
  >
    <img
      :src="size === 'lg' ? asset.image : asset.thumbnail"
      :alt="asset.category ?? asset.id"
      class="h-full w-full object-contain p-2 transition duration-[var(--duration-hover)] ease-[var(--ease-apple)] group-hover:scale-[1.035]"
      :class="{ 'p-5': size === 'lg' }"
      loading="lazy"
    />
  </div>
</template>
