<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { LMap, LTileLayer, LMarker, LCircle } from '@vue-leaflet/vue-leaflet'
import type { LeafletMouseEvent } from 'leaflet'

type LatLon = { lat: number; lon: number }

const props = defineProps<{
  modelValue: LatLon | null
  zoom?: number
  height?: string
  /** Optional circle radius in meters drawn around the marker (e.g. search range). */
  circleRadiusM?: number
}>()
const emit = defineEmits<{ 'update:modelValue': [LatLon] }>()

const center = ref<[number, number]>([props.modelValue?.lat ?? 0, props.modelValue?.lon ?? 0])
const markerPos = ref<[number, number] | null>(
  props.modelValue ? [props.modelValue.lat, props.modelValue.lon] : null,
)

const zoom = computed(() => props.zoom ?? 4)
const mapStyle = computed(() => ({ height: props.height ?? '320px', width: '100%' }))

watch(
  () => props.modelValue,
  (v) => {
    if (!v) return
    const next: [number, number] = [v.lat, v.lon]
    center.value = next
    markerPos.value = next
  },
)

function onMapClick(e: LeafletMouseEvent) {
  const { lat, lng } = e.latlng
  emit('update:modelValue', { lat, lon: lng })
}
</script>

<template>
  <LMap
    :zoom="zoom"
    :center="center"
    :useGlobalLeaflet="false"
    :style="mapStyle"
    @click="onMapClick"
  >
    <LTileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    />
    <LMarker v-if="markerPos" :lat-lng="markerPos" />
    <LCircle
      v-if="markerPos && circleRadiusM"
      :lat-lng="markerPos"
      :radius="circleRadiusM"
      color="#1976d2"
      :weight="1"
      fill-color="#1976d2"
      :fill-opacity="0.08"
    />
  </LMap>
</template>
