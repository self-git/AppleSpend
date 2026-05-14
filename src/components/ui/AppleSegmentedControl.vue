<script setup lang="ts" generic="T extends string">
defineProps<{
  modelValue: T
  options: Array<{ label: string; value: T }>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()
</script>

<template>
  <div class="inline-flex rounded-[var(--radius-control)] bg-apple-bg p-1">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="focus-ring rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold transition duration-[var(--duration-hover)] ease-[var(--ease-apple)]"
      :class="option.value === modelValue ? 'bg-white text-apple-black shadow-apple-soft' : 'text-apple-gray hover:text-apple-black'"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
