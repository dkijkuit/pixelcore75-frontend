<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import type { AnyScreen } from '@/registry/screensRegistry.ts'

// Heavy: pulls in Leaflet — load lazily so the form fields render immediately
const MapPicker = defineAsyncComponent(() => import('@/components/map/MapPicker.vue'))

// Narrow to our Nearby Aircraft screen
type T = Extract<AnyScreen, { screenType: 'NEARBY_AIRCRAFT' }>

const props = defineProps<{ modelValue: T }>()
const emit = defineEmits<{ 'update:modelValue': [T] }>()

function update(patch: Partial<T>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

function setLatLon(next: { lat: number; lon: number }) {
  update({ latLon: next })
}

const latLon = computed({
  get: () => props.modelValue.latLon ?? { lat: 0, lon: 0 },
  set: (v) => setLatLon(v),
})

const displayModeItems = [
  { title: 'Radar (animated sweep)', value: 'RADAR' },
  { title: 'Closest aircraft', value: 'CLOSEST' },
  { title: 'Nearby list', value: 'LIST' },
] as const

const unitItems = [
  { title: 'Aviation (FL / kt)', value: 'AVIATION' },
  { title: 'Metric (m / km/h)', value: 'METRIC' },
] as const
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <v-select
      label="Display mode"
      :items="displayModeItems"
      item-title="title"
      item-value="value"
      :model-value="modelValue.displayMode"
      @update:model-value="(v) => update({ displayMode: (v as T['displayMode']) || 'RADAR' })"
      required
    />

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

    <!-- Map picker: clicking sets both lat/lon; circle shows the search radius -->
    <MapPicker
      v-model="latLon"
      :zoom="5"
      height="320px"
      :circle-radius-m="modelValue.radiusNm * 1852"
    >
      <template #fallback>
        <v-skeleton-loader type="image" height="320" />
      </template>
    </MapPicker>

    <v-slider
      label="Radius"
      :model-value="modelValue.radiusNm"
      :min="5"
      :max="250"
      :step="5"
      thumb-label="always"
      @update:model-value="(v) => update({ radiusNm: Number(v) })"
    >
      <template #thumb-label="{ modelValue: radius }">{{ radius }} nm</template>
    </v-slider>

    <v-checkbox
      label="Military aircraft only"
      :model-value="modelValue.militaryOnly"
      @update:model-value="(v) => update({ militaryOnly: Boolean(v) })"
    />

    <v-select
      label="Units"
      :items="unitItems"
      item-title="title"
      item-value="value"
      :model-value="modelValue.units"
      @update:model-value="(v) => update({ units: (v as T['units']) || 'AVIATION' })"
      required
    />

    <v-text-field
      v-if="modelValue.displayMode === 'RADAR'"
      type="number"
      label="Sweep smoothness (ms per frame)"
      :model-value="modelValue.frameDelayMs"
      min="50"
      max="1000"
      step="10"
      hint="Lower is smoother; the sweep turns ~every 4s and continues seamlessly across slots"
      persistent-hint
      @update:model-value="
        (v) => update({ frameDelayMs: Math.min(1000, Math.max(50, Number(v) || 100)) })
      "
    />
  </div>
</template>
