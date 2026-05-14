<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
    <div>
      <h2 class="text-2xl font-semibold tracking-normal text-apple-black">{{ title }}</h2>
      <p v-if="description" class="mt-1 text-sm leading-6 text-apple-gray">{{ description }}</p>
    </div>
    <slot />
  </div>
</template>
