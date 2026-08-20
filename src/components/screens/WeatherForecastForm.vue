<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import type { AnyScreen } from '@/registry/screensRegistry.ts'

// Heavy: pulls in Leaflet — load lazily so the form fields render immediately
const MapPicker = defineAsyncComponent(() => import('@/components/map/MapPicker.vue'))

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
        @update:model-value="(v) => setLatLon({ ...latLon, lat: Number(v) })"
      />
      <v-text-field
        type="number"
        label="Longitude"
        :model-value="latLon.lon"
        step="0.0001"
        class="flex-grow-1"
        required
        @update:model-value="(v) => setLatLon({ ...latLon, lon: Number(v) })"
      />
    </div>

    <!-- Map picker: clicking sets lat/lon -->
    <MapPicker v-model="latLon" :zoom="5" height="320px">
      <template #fallback>
        <v-skeleton-loader type="image" height="320" />
      </template>
    </MapPicker>
  </div>
</template>
