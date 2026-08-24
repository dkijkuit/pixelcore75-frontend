<script setup lang="ts">
import { FONT_IDS, FONT_LABELS, MAX_PARAM_LAYERS, paramLayerCount, type PxdFontId } from '@/types/pxd.ts'
import type { Designer } from './useDesigner.ts'

const props = defineProps<{ designer: Designer }>()

const fontItems = FONT_IDS.map((id) => ({ title: FONT_LABELS[id], value: id }))

function clampInt(v: string | number | null, fallback: number) {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? n : fallback
}

function selectLayer(index: number) {
  props.designer.selectLayer(props.designer.selectedLayer === index ? null : index)
}

function addDisabled() {
  return (
    props.designer.doc.frames.length > 1 ||
    paramLayerCount(props.designer.doc) >= MAX_PARAM_LAYERS
  )
}

function nudgeSelected(dx: number, dy: number) {
  const anchor = props.designer.overlayAnchor()
  if (!anchor) return
  props.designer.snapshot()
  props.designer.setOverlayAnchor(anchor.x + dx, anchor.y + dy)
}
</script>

<template>
  <div class="d-flex flex-column ga-2">
    <div class="d-flex align-center ga-2">
      <span class="text-subtitle-2">Animation layers</span>
      <v-spacer />
      <v-btn
        size="x-small"
        variant="tonal"
        prepend-icon="mdi-radar"
        :disabled="addDisabled()"
        @click="designer.addSweep()"
      >
        Sweep
      </v-btn>
      <v-btn
        size="x-small"
        variant="tonal"
        prepend-icon="mdi-arrow-expand-horizontal"
        :disabled="addDisabled()"
        @click="designer.addScroll()"
      >
        Scroll
      </v-btn>
      <v-btn
        size="x-small"
        variant="tonal"
        prepend-icon="mdi-eye-outline"
        :disabled="addDisabled()"
        @click="designer.addBlink()"
      >
        Blink
      </v-btn>
    </div>

    <div v-if="!designer.paramLayers().length" class="text-body-2 text-medium-emphasis">
      Panel-side animations (sweep line, scrolling text, blinking region) — up to
      {{ MAX_PARAM_LAYERS }} per design, single frame.
    </div>

    <div
      v-for="{ index, layer } in designer.paramLayers()"
      :key="index"
      class="overlay rounded pa-2"
      :class="{ 'overlay-active': designer.selectedLayer === index }"
    >
      <div class="d-flex align-center ga-2">
        <v-btn
          size="x-small"
          variant="text"
          :icon="
            designer.selectedLayer === index
              ? 'mdi-checkbox-marked-circle'
              : 'mdi-checkbox-blank-circle-outline'
          "
          :aria-label="`Select animation layer ${index}`"
          @click="selectLayer(index)"
        />
        <v-icon size="small" class="mr-1">
          {{ layer.type === 'sweep' ? 'mdi-radar' : layer.type === 'scroll' ? 'mdi-arrow-expand-horizontal' : 'mdi-eye-outline' }}
        </v-icon>
        <div v-if="layer.type === 'scroll'" class="text-body-2 layer-text">{{ layer.text }}</div>
        <div v-else class="text-body-2 text-capitalize">{{ layer.type }}</div>
        <v-spacer />
        <v-btn
          size="x-small"
          variant="text"
          color="error"
          icon="mdi-delete"
          :aria-label="`Remove animation layer ${index}`"
          @click="designer.removeLayer(index)"
        />
      </div>

      <div v-if="designer.selectedLayer === index" class="d-flex ga-2 flex-wrap mt-2">
        <template v-if="layer.type === 'sweep'">
          <v-text-field
            label="Center X"
            type="number"
            density="compact"
            hide-details
            :model-value="layer.cx"
            style="max-width: 90px"
            @update:model-value="(v) => designer.updateParam(index, { cx: clampInt(v, layer.cx) })"
          />
          <v-text-field
            label="Center Y"
            type="number"
            density="compact"
            hide-details
            :model-value="layer.cy"
            style="max-width: 90px"
            @update:model-value="(v) => designer.updateParam(index, { cy: clampInt(v, layer.cy) })"
          />
          <v-text-field
            label="Radius"
            type="number"
            density="compact"
            hide-details
            :model-value="layer.r"
            style="max-width: 90px"
            @update:model-value="(v) => designer.updateParam(index, { r: clampInt(v, layer.r) })"
          />
          <v-text-field
            label="Color"
            density="compact"
            hide-details
            :model-value="layer.color"
            style="max-width: 110px"
            @change="(v: string | null) => designer.updateParam(index, { color: String(v || '#00FF00') })"
          />
          <v-text-field
            label="°/sec"
            type="number"
            density="compact"
            hide-details
            :model-value="layer.speedDegPerSec"
            style="max-width: 90px"
            @update:model-value="
              (v) => designer.updateParam(index, { speedDegPerSec: clampInt(v, layer.speedDegPerSec) })
            "
          />
        </template>

        <template v-else-if="layer.type === 'scroll'">
          <v-text-field
            label="Text"
            density="compact"
            hide-details
            :model-value="layer.text"
            @update:model-value="
              (v) => designer.updateParam(index, { text: String(v || '').slice(0, 255) })
            "
          />
          <v-select
            label="Font"
            density="compact"
            hide-details
            :items="fontItems"
            :model-value="layer.font"
            style="max-width: 160px"
            @update:model-value="(v) => designer.updateParam(index, { font: v as PxdFontId })"
          />
          <v-text-field
            label="Color"
            density="compact"
            hide-details
            :model-value="layer.color"
            style="max-width: 110px"
            @change="(v: string | null) => designer.updateParam(index, { color: String(v || '#FFFFFF') })"
          />
          <v-text-field
            label="X"
            type="number"
            density="compact"
            hide-details
            :model-value="layer.x"
            style="max-width: 80px"
            @update:model-value="(v) => designer.updateParam(index, { x: clampInt(v, layer.x) })"
          />
          <v-text-field
            label="Y"
            type="number"
            density="compact"
            hide-details
            :model-value="layer.y"
            style="max-width: 80px"
            @update:model-value="(v) => designer.updateParam(index, { y: clampInt(v, layer.y) })"
          />
          <v-text-field
            label="W"
            type="number"
            density="compact"
            hide-details
            :model-value="layer.w"
            style="max-width: 80px"
            @update:model-value="(v) => designer.updateParam(index, { w: clampInt(v, layer.w) })"
          />
          <v-text-field
            label="H"
            type="number"
            density="compact"
            hide-details
            :model-value="layer.h"
            style="max-width: 80px"
            @update:model-value="(v) => designer.updateParam(index, { h: clampInt(v, layer.h) })"
          />
          <v-text-field
            label="ms/px"
            type="number"
            density="compact"
            hide-details
            :model-value="layer.speedMsPerPx"
            style="max-width: 100px"
            @update:model-value="
              (v) => designer.updateParam(index, { speedMsPerPx: clampInt(v, layer.speedMsPerPx) })
            "
          />
        </template>

        <template v-else>
          <v-text-field
            label="X"
            type="number"
            density="compact"
            hide-details
            :model-value="layer.x"
            style="max-width: 80px"
            @update:model-value="(v) => designer.updateParam(index, { x: clampInt(v, layer.x) })"
          />
          <v-text-field
            label="Y"
            type="number"
            density="compact"
            hide-details
            :model-value="layer.y"
            style="max-width: 80px"
            @update:model-value="(v) => designer.updateParam(index, { y: clampInt(v, layer.y) })"
          />
          <v-text-field
            label="W"
            type="number"
            density="compact"
            hide-details
            :model-value="layer.w"
            style="max-width: 80px"
            @update:model-value="(v) => designer.updateParam(index, { w: clampInt(v, layer.w) })"
          />
          <v-text-field
            label="H"
            type="number"
            density="compact"
            hide-details
            :model-value="layer.h"
            style="max-width: 80px"
            @update:model-value="(v) => designer.updateParam(index, { h: clampInt(v, layer.h) })"
          />
          <v-text-field
            label="Period (ms)"
            type="number"
            density="compact"
            hide-details
            :model-value="layer.periodMs"
            style="max-width: 110px"
            @update:model-value="(v) => designer.updateParam(index, { periodMs: clampInt(v, layer.periodMs) })"
          />
        </template>

        <v-btn
          size="x-small"
          variant="text"
          icon="mdi-arrow-left"
          :aria-label="`Move layer ${index} left`"
          @click="nudgeSelected(-1, 0)"
        />
        <v-btn
          size="x-small"
          variant="text"
          icon="mdi-arrow-right"
          :aria-label="`Move layer ${index} right`"
          @click="nudgeSelected(1, 0)"
        />
        <v-btn
          size="x-small"
          variant="text"
          icon="mdi-arrow-up"
          :aria-label="`Move layer ${index} up`"
          @click="nudgeSelected(0, -1)"
        />
        <v-btn
          size="x-small"
          variant="text"
          icon="mdi-arrow-down"
          :aria-label="`Move layer ${index} down`"
          @click="nudgeSelected(0, 1)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  border: 1px solid rgba(128, 128, 128, 0.3);
}

.overlay-active {
  border-color: rgb(var(--v-theme-primary));
}

.layer-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 260px;
}
</style>
