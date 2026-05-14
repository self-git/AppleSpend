<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'default' | 'blue' | 'green' | 'orange' | 'red'
  }>(),
  {
    tone: 'default',
  },
)
</script>

<template>
  <span
    class="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold"
    :class="{
      'border-apple-line bg-apple-bg text-[#515154]': tone === 'default',
      'border-blue-100 bg-blue-50 text-apple-blue': tone === 'blue',
      'border-green-100 bg-green-50 text-apple-green': tone === 'green',
      'border-orange-100 bg-orange-50 text-apple-orange': tone === 'orange',
      'border-red-100 bg-red-50 text-apple-red': tone === 'red',
    }"
  >
    <slot />
  </span>
</template>
