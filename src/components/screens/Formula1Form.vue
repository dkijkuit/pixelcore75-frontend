<!-- src/components/screens/Formula1Form.vue -->
<script setup lang="ts">
import type { AnyScreen } from '@/registry/screensRegistry.ts'
import { timezoneItems } from '@/utils/timezones.ts'

// Narrow to our Formula 1 screen
type T = Extract<AnyScreen, { screenType: 'FORMULA1' }>

const props = defineProps<{ modelValue: T }>()
const emit = defineEmits<{ 'update:modelValue': [T] }>()

function update(patch: Partial<T>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

const detailTypeItems = [
  { title: 'Calendar', value: 'CALENDAR' },
  { title: 'Next event', value: 'NEXT_EVENT' },
  { title: 'Next session', value: 'NEXT_SESSION' },
  { title: 'Standings', value: 'STANDINGS' },
] as const
</script>

<template>
  <div class="d-flex flex-column ga-3">
    <v-select
      label="Details"
      :items="detailTypeItems"
      item-title="title"
      item-value="value"
      :model-value="modelValue.detailsType"
      @update:model-value="(v) => update({ detailsType: (v as T['detailsType']) || 'CALENDAR' })"
      required
    />

    <v-text-field
      type="number"
      label="Duration (seconds)"
      min="1"
      :model-value="modelValue.durationSeconds"
      @update:model-value="(v) => update({ durationSeconds: Number(v) || 10 })"
      required
    />

    <v-select
      label="Timezone"
      :items="timezoneItems"
      :model-value="modelValue.timezone"
      @update:model-value="(v) => update({ timezone: String(v || 'UTC') })"
      required
    />
  </div>
</template>
