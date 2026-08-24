<script setup lang="ts">
import { ref } from 'vue'
import { PALETTE_16, quantizeToRgb565 } from '@/types/pxd.ts'
import type { Designer } from './useDesigner.ts'

const props = defineProps<{ designer: Designer }>()

const customColor = ref('')

function applyCustom(value: string | null) {
  const hex = String(value || '').trim()
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    props.designer.toast('Color must be #RRGGBB')
    return
  }
  const snapped = quantizeToRgb565(hex)
  customColor.value = snapped
  props.designer.setColor(snapped)
}
</script>

<template>
  <div class="d-flex flex-column ga-2">
    <div class="d-flex ga-1 flex-wrap" style="max-width: 260px">
      <button
        v-for="color in PALETTE_16"
        :key="color"
        type="button"
        class="swatch rounded"
        :class="{ 'swatch-active': designer.color === color }"
        :style="{ backgroundColor: color }"
        :aria-label="`Pick ${color}`"
        @click="designer.setColor(color)"
      />
    </div>
    <v-text-field
      v-model="customColor"
      label="Custom color"
      density="compact"
      hide-details
      placeholder="#RRGGBB"
      style="max-width: 160px"
      @change="(v: string | null) => applyCustom(v)"
    />
  </div>
</template>

<style scoped>
.swatch {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.25);
  cursor: pointer;
}

.swatch-active {
  border-color: rgb(var(--v-theme-primary));
  outline: 1px solid rgb(var(--v-theme-primary));
}
</style>
