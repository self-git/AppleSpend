<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'text' | 'danger'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  {
    variant: 'secondary',
    type: 'button',
    disabled: false,
  },
)
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="focus-ring inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] px-4 text-sm font-semibold transition duration-[var(--duration-hover)] ease-[var(--ease-apple)] disabled:cursor-not-allowed disabled:opacity-45"
    :class="{
      'bg-apple-blue text-white hover:bg-[#0077ed]': variant === 'primary',
      'border border-apple-line bg-white text-apple-black hover:bg-apple-bg': variant === 'secondary',
      'bg-transparent text-apple-blue hover:bg-blue-50': variant === 'text',
      'bg-red-50 text-apple-red hover:bg-red-100': variant === 'danger',
    }"
  >
    <slot />
  </button>
</template>
