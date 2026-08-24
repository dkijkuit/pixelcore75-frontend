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

// radiusNm is the backend contract; show/edit kilometers when units are metric
const isMetric = computed(() => props.modelValue.units === 'METRIC')
const METERS_PER_NM = 1852

const radiusValue = computed({
  get: () =>
    isMetric.value
      ? Math.round(((props.modelValue.radiusNm * METERS_PER_NM) / 1000) * 10) / 10
      : props.modelValue.radiusNm,
  set: (v) => {
    const nm = isMetric.value ? (Number(v) * 1000) / METERS_PER_NM : Number(v)
    update({ radiusNm: Math.min(250, Math.max(5, Math.round(nm))) })
  },
})
</script>

<template>
  <div class="d-flex flex-column ga-3">
    <div class="d-flex ga-3">
      <v-select
        label="Display mode"
        class="flex-grow-1"
        :items="displayModeItems"
        item-title="title"
        item-value="value"
        :model-value="modelValue.displayMode"
        @update:model-value="(v) => update({ displayMode: (v as T['displayMode']) || 'RADAR' })"
        required
      />
      <v-select
        label="Units"
        class="flex-grow-1"
        :items="unitItems"
        item-title="title"
        item-value="value"
        :model-value="modelValue.units"
        @update:model-value="(v) => update({ units: (v as T['units']) || 'AVIATION' })"
        required
      />
    </div>

    <!-- Fields stay, remain the single source of truth (map clicks update them) -->
    <div class="d-flex ga-3">
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
      height="260px"
      :circle-radius-m="modelValue.radiusNm * 1852"
    >
      <template #fallback>
        <v-skeleton-loader type="image" height="260" />
      </template>
    </MapPicker>

    <!-- mt: keep the always-on thumb-label clear of the Leaflet map above (its panes
         sit at z-index 200-1000 and would paint over the label) -->
    <v-slider
      label="Radius"
      class="mt-6"
      color="primary"
      v-model="radiusValue"
      :min="isMetric ? 10 : 5"
      :max="isMetric ? 465 : 250"
      :step="5"
      thumb-label="always"
      track-size="6"
    >
      <template #thumb-label="{ modelValue: radius }">
        {{ radius }} {{ isMetric ? 'km' : 'nm' }}
      </template>
    </v-slider>

    <div class="d-flex ga-6 align-center">
      <v-checkbox
        label="Military aircraft only"
        :model-value="modelValue.militaryOnly"
        @update:model-value="(v) => update({ militaryOnly: Boolean(v) })"
      />
      <v-text-field
        v-if="modelValue.displayMode === 'RADAR'"
        type="number"
        label="Sweep smoothness"
        suffix="ms/frame"
        :model-value="modelValue.frameDelayMs"
        min="50"
        max="1000"
        step="10"
        hint="Lower is smoother — the sweep turns ~every 4s"
        persistent-hint
        class="flex-grow-1"
        @update:model-value="
          (v) => update({ frameDelayMs: Math.min(1000, Math.max(50, Number(v) || 100)) })
        "
      />
    </div>
  </div>
</template>

<style scoped>
/* Vuetify's default thumb-label is translucent surface-variant — unreadable against
   this app's dialog surfaces. Make it a solid primary chip (wedge inherits background).
   Also let it size to content: the default 35px min-width wraps "250 nm" onto two
   clipped lines. */
:deep(.v-slider-thumb__label) {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  white-space: nowrap;
  min-width: max-content;
  padding-inline: 10px;
}
</style>
