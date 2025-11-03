<script setup lang="ts">
import { computed } from 'vue'
import MapPicker from '@/components/map/MapPicker.vue'
import type { AnyScreen } from '@/registry/screensRegistry.ts'

type T = Extract<AnyScreen, { screenType: 'WEATHER_FORECAST' }>
const props = defineProps<{ modelValue: T }>()
const emit = defineEmits<{ 'update:modelValue': [T] }>()

function setLatLon(next: { lat: number; lon: number }) {
  emit('update:modelValue', { ...props.modelValue, latLon: next })
}

const latLon = computed({
  get: () => props.modelValue.latLon ?? { lat: 0, lon: 0 },
  set: (v) => setLatLon(v),
})
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <!-- Fields stay, remain the single source of truth -->
    <div class="d-flex ga-2">
      <v-text-field
        type="number"
        label="Latitude"
        :model-value="latLon.lat"
        step="0.0001"
        class="flex-grow-1"
        required
        @update:model-value="v => latLon.value = { ...latLon.value, lat: Number(v) }"
      />
      <v-text-field
        type="number"
        label="Longitude"
        :model-value="latLon.lon"
        step="0.0001"
        class="flex-grow-1"
        required
        @update:model-value="v => latLon.value = { ...latLon.value, lon: Number(v) }"
      />
    </div>

    <!-- Map picker: clicking sets both lat/lon -->
    <MapPicker v-model="latLon" :zoom="5" height="320px" />
  </div>
</template>
