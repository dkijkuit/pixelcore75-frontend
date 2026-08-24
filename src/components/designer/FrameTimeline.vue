<script setup lang="ts">
import { hasParamLayers } from '@/types/pxd.ts'
import type { Designer } from './useDesigner.ts'

const props = defineProps<{ designer: Designer }>()

function notify(result: string | null) {
  if (result) props.designer.toast(result)
}

function frameAddDisabled() {
  return hasParamLayers(props.designer.doc)
}
</script>

<template>
  <div class="d-flex flex-column ga-2">
    <div class="d-flex align-center ga-2 flex-wrap">
      <span class="text-subtitle-2"> Frames ({{ designer.doc.frames.length }}/60) </span>
      <v-spacer />
      <v-switch
        density="compact"
        hide-details
        label="Onion skin"
        :model-value="designer.onionSkin"
        @update:model-value="(v) => designer.setOnionSkin(Boolean(v))"
      />
    </div>

    <div class="d-flex ga-2 flex-wrap">
      <v-btn
        size="x-small"
        variant="tonal"
        prepend-icon="mdi-plus"
        :disabled="frameAddDisabled()"
        @click="notify(designer.addFrame())"
      >
        Add
      </v-btn>
      <v-btn
        size="x-small"
        variant="tonal"
        prepend-icon="mdi-content-copy"
        :disabled="frameAddDisabled()"
        @click="notify(designer.duplicateFrame())"
      >
        Duplicate
      </v-btn>
      <v-btn
        size="x-small"
        variant="tonal"
        color="error"
        prepend-icon="mdi-delete"
        :disabled="designer.doc.frames.length <= 1"
        @click="notify(designer.deleteFrame())"
      >
        Delete
      </v-btn>
      <v-btn size="x-small" variant="text" icon="mdi-arrow-left" @click="designer.moveFrame(-1)" />
      <v-btn size="x-small" variant="text" icon="mdi-arrow-right" @click="designer.moveFrame(1)" />
    </div>

    <div class="d-flex ga-2 flex-wrap">
      <button
        v-for="(frame, i) in designer.doc.frames"
        :key="i"
        type="button"
        class="frame-thumb rounded"
        :class="{ 'frame-thumb-active': i === designer.frameIndex }"
        :aria-label="`Select frame ${i + 1}`"
        @click="designer.selectFrame(i)"
      >
        <img :src="designer.frameBitmapUrl(i)" :alt="`Frame ${i + 1}`" />
        <span class="text-caption">{{ i + 1 }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.frame-thumb {
  padding: 2px;
  border: 2px solid transparent;
  background: rgba(128, 128, 128, 0.15);
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

.frame-thumb-active {
  border-color: rgb(var(--v-theme-primary));
}

.frame-thumb img {
  width: 64px;
  height: 32px;
  image-rendering: pixelated;
  display: block;
}
</style>
