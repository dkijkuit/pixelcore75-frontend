<script setup lang="ts">
import type { AnyScreen } from '@/registry/screensRegistry.ts'
import { timezoneItems } from '@/utils/timezones.ts'
// Narrow to our Clock screen
type T = Extract<AnyScreen, { screenType: 'DATE' }>

const props = defineProps<{ modelValue: T }>()
const emit = defineEmits<{ 'update:modelValue': [T] }>()

function update(patch: Partial<T>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}
</script>

<template>
  <div class="d-flex flex-column ga-3">
    <v-select
      label="Timezone"
      :items="timezoneItems"
      :model-value="modelValue.timezone"
      @update:model-value="v => update({ timezone: String(v || 'UTC') })"
      required
    />

    <!-- Color picker -->
    <v-color-picker
      hide-inputs
      mode="hexa"
      canvas-height="150"
      :model-value="modelValue.color"
      @update:model-value="v => update({ color: typeof v === 'string' ? v : '#ffffff' })"
    />
  </div>
</template>
