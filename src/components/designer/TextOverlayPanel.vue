<script setup lang="ts">
import { FONT_IDS, FONT_LABELS, type PxdFontId } from '@/types/pxd.ts'
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
</script>

<template>
  <div class="d-flex flex-column ga-2">
    <div class="d-flex align-center ga-2">
      <span class="text-subtitle-2">Text overlays</span>
      <v-spacer />
      <v-btn
        size="x-small"
        variant="tonal"
        prepend-icon="mdi-format-text"
        @click="designer.addText()"
      >
        Add
      </v-btn>
    </div>

    <div v-if="!designer.textLayers().length" class="text-body-2 text-medium-emphasis">
      No text overlays on this frame.
    </div>

    <div
      v-for="{ index, layer } in designer.textLayers()"
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
          :aria-label="`Select overlay ${index}`"
          @click="selectLayer(index)"
        />
        <v-text-field
          label="Text"
          density="compact"
          hide-details
          :model-value="layer.text"
          @update:model-value="
            (v) => designer.updateText(index, { text: String(v || '').slice(0, 255) })
          "
        />
        <v-btn
          size="x-small"
          variant="text"
          color="error"
          icon="mdi-delete"
          :aria-label="`Remove overlay ${index}`"
          @click="designer.removeLayer(index)"
        />
      </div>

      <div v-if="designer.selectedLayer === index" class="d-flex ga-2 flex-wrap mt-2">
        <v-select
          label="Font"
          density="compact"
          hide-details
          :items="fontItems"
          :model-value="layer.font"
          style="max-width: 160px"
          @update:model-value="(v) => designer.updateText(index, { font: v as PxdFontId })"
        />
        <v-text-field
          label="Color"
          density="compact"
          hide-details
          :model-value="layer.color"
          style="max-width: 110px"
          @change="
            (v: string | null) => designer.updateText(index, { color: String(v || '#FFFFFF') })
          "
        />
        <v-text-field
          label="X"
          type="number"
          density="compact"
          hide-details
          :model-value="layer.x"
          style="max-width: 90px"
          @update:model-value="(v) => designer.updateText(index, { x: clampInt(v, layer.x) })"
        />
        <v-text-field
          label="Y"
          type="number"
          density="compact"
          hide-details
          :model-value="layer.y"
          style="max-width: 90px"
          @update:model-value="(v) => designer.updateText(index, { y: clampInt(v, layer.y) })"
        />
        <v-btn
          size="x-small"
          variant="text"
          icon="mdi-arrow-left"
          :aria-label="`Move overlay ${index} left`"
          @click="designer.nudgeSelectedText(-1, 0)"
        />
        <v-btn
          size="x-small"
          variant="text"
          icon="mdi-arrow-right"
          :aria-label="`Move overlay ${index} right`"
          @click="designer.nudgeSelectedText(1, 0)"
        />
        <v-btn
          size="x-small"
          variant="text"
          icon="mdi-arrow-up"
          :aria-label="`Move overlay ${index} up`"
          @click="designer.nudgeSelectedText(0, -1)"
        />
        <v-btn
          size="x-small"
          variant="text"
          icon="mdi-arrow-down"
          :aria-label="`Move overlay ${index} down`"
          @click="designer.nudgeSelectedText(0, 1)"
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
</style>
