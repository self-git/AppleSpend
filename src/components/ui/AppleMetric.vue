<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value: string
    detail?: string
    tone?: 'hero' | 'normal' | 'quiet'
  }>(),
  {
    tone: 'normal',
  },
)
</script>

<template>
  <div>
    <p class="text-sm font-medium text-apple-gray">{{ label }}</p>
    <p
      class="mt-2 font-semibold tracking-normal text-apple-black"
      :class="{
        'text-5xl leading-none md:text-7xl': tone === 'hero',
        'text-3xl leading-tight md:text-4xl': tone === 'normal',
        'text-2xl leading-tight': tone === 'quiet',
      }"
    >
      {{ value }}
    </p>
    <p v-if="detail" class="mt-3 max-w-xl text-sm leading-6 text-[#515154]">{{ detail }}</p>
  </div>
</template>
