<script setup lang="ts">
import { timezoneItems } from '@/utils/timezones.ts'
import type { AnyScreen } from '@/registry/screensRegistry.ts'
// Narrow to our Clock screen
type T = Extract<AnyScreen, { screenType: 'CLOCK' }>

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

    <v-switch
      inset
      :model-value="modelValue.format24hr"
      @update:model-value="v => update({ format24hr: !!v })"
      :label="modelValue.format24hr ? '24-hour format' : '12-hour format'"
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
