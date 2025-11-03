<script setup lang="ts">
import type { AnyScreen } from '@/registry/screensRegistry.ts'
type T = Extract<AnyScreen, { screenType: 'CRYPTO_TICKER' }>
const props = defineProps<{ modelValue: T }>()
const emit = defineEmits<{ 'update:modelValue': [T] }>()
function updateConfig(patch: Partial<T['config']>) {
  emit('update:modelValue', {
    ...props.modelValue,
    config: { ...props.modelValue.config, ...patch },
  })
}
</script>

<template>
  <div class="d-flex ga-2">
    <v-text-field
      label="Symbol" required
      :model-value="modelValue.config?.symbol"
      @update:model-value="v => updateConfig({ symbol: v || '' })"
      class="flex-grow-1"
    />
    <v-text-field
      label="Currency" required
      :model-value="modelValue.config?.currency"
      @update:model-value="v => updateConfig({ currency: v || '' })"
      class="flex-grow-1"
    />
  </div>
</template>
