<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'plain' | 'raised' | 'subtle' | 'quiet' | 'hero' | 'media'
    padded?: boolean
    interactive?: boolean
  }>(),
  {
    tone: 'plain',
    padded: true,
    interactive: true,
  },
)
</script>

<template>
  <section
    class="border border-apple-line bg-white transition duration-[var(--duration-hover)] ease-[var(--ease-apple)]"
    :class="[
      padded ? 'p-5 md:p-6' : '',
      tone === 'plain' ? 'rounded-[var(--radius-card)]' : '',
      tone === 'raised' ? 'rounded-[var(--radius-hero)] shadow-apple' : '',
      tone === 'subtle' ? 'rounded-[var(--radius-card)] bg-apple-card' : '',
      tone === 'quiet' ? 'rounded-[var(--radius-panel)] bg-white/72 shadow-apple-soft backdrop-blur' : '',
      tone === 'hero' ? 'rounded-[var(--radius-hero)] bg-white shadow-apple' : '',
      tone === 'media' ? 'rounded-[var(--radius-card)] bg-white shadow-apple-soft' : '',
      interactive ? 'hover:-translate-y-0.5 hover:shadow-apple-hover' : '',
    ]"
  >
    <slot />
  </section>
</template>
