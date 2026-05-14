<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  description?: string
}>()
</script>

<template>
  <div class="mx-auto max-w-7xl px-5 pb-8 pt-10 md:px-8 md:pt-14">
    <p v-if="eyebrow" class="text-sm font-semibold text-apple-blue">{{ eyebrow }}</p>
    <div class="mt-2 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="max-w-4xl text-4xl font-semibold leading-tight tracking-normal md:text-6xl">{{ title }}</h1>
        <p v-if="description" class="mt-4 max-w-2xl text-base leading-7 text-[#515154] md:text-lg">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap gap-3">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
