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
      'h-44 w-full p-3 sm:h-48 sm:p-4': size === 'lg',
    }"
  >
    <div
      class="grid h-full w-full place-items-center"
      :class="{ 'rounded-[calc(var(--radius-media)-10px)] bg-white/55': size === 'lg' }"
    >
      <img
        :src="size === 'lg' ? asset.image : asset.thumbnail"
        :alt="asset.category ?? asset.id"
        class="object-contain transition duration-[var(--duration-hover)] ease-[var(--ease-apple)] group-hover:scale-[1.035]"
        :class="{
          'h-full w-full p-2': size !== 'lg',
          'max-h-full max-w-full p-1 sm:p-2': size === 'lg',
        }"
        loading="lazy"
      />
    </div>
  </div>
</template>
