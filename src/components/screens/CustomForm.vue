<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { MAX_DELAY_MS, MIN_DELAY_MS, emptyDesign, parseDesign, validatePxd } from '@/types/pxd.ts'
import { previewCustomDesign } from '@/service/screens.ts'
import { createDesigner } from '@/components/designer/useDesigner.ts'
import PixelCanvas from '@/components/designer/PixelCanvas.vue'
import FrameTimeline from '@/components/designer/FrameTimeline.vue'
import PalettePicker from '@/components/designer/PalettePicker.vue'
import TextOverlayPanel from '@/components/designer/TextOverlayPanel.vue'
import ParamOverlayPanel from '@/components/designer/ParamOverlayPanel.vue'
import {
  IMAGE_FITS,
  decodeImageFile,
  scaleToBitmapUrl,
  type DecodedImage,
  type ImageFit,
} from '@/components/designer/imageImport.ts'

/** The designer edits the inline design shape (legacy rotation entries, library editor). */
type T = { screenType: 'CUSTOM'; durationSeconds: number; design: string }

const props = defineProps<{ modelValue: T }>()
const emit = defineEmits<{ 'update:modelValue': [T] }>()

const initial = parseDesign(props.modelValue.design)
const designer = createDesigner('doc' in initial ? initial.doc : emptyDesign())

const tools = [
  { value: 'brush', icon: 'mdi-brush', title: 'Brush' },
  { value: 'eraser', icon: 'mdi-eraser', title: 'Eraser' },
  { value: 'fill', icon: 'mdi-format-color-fill', title: 'Flood fill' },
  { value: 'line', icon: 'mdi-vector-line', title: 'Line' },
  { value: 'rect', icon: 'mdi-checkbox-blank-outline', title: 'Rectangle' },
  { value: 'rectFill', icon: 'mdi-checkbox-blank', title: 'Filled rectangle' },
  { value: 'circle', icon: 'mdi-checkbox-blank-circle-outline', title: 'Circle' },
  { value: 'circleFill', icon: 'mdi-checkbox-blank-circle', title: 'Filled circle' },
  { value: 'eyedropper', icon: 'mdi-eyedropper', title: 'Eyedropper' },
  { value: 'move', icon: 'mdi-cursor-move', title: 'Move selected overlay' },
] as const

const snackbar = reactive({ show: false, text: '' })
watch(
  () => designer.toastSeq,
  () => {
    snackbar.text = designer.toastText
    snackbar.show = designer.toastSeq > 0
  },
)

let emitTimer: number | undefined
function emitConfig() {
  const problem = validatePxd(designer.doc)
  if (problem) {
    designer.toast(`Design is not valid: ${problem}`)
    return
  }
  emit('update:modelValue', {
    screenType: 'CUSTOM' as const,
    durationSeconds: props.modelValue.durationSeconds,
    design: JSON.stringify(designer.doc),
  })
}

watch(
  () => designer.doc,
  () => {
    if (emitTimer) window.clearTimeout(emitTimer)
    emitTimer = window.setTimeout(emitConfig, 300)
  },
  { deep: true },
)

function onDurationChange(v: number | string | null) {
  const n = Math.round(Number(v))
  emit('update:modelValue', {
    screenType: 'CUSTOM' as const,
    durationSeconds: Number.isFinite(n) && n > 0 ? n : 10,
    design: JSON.stringify(designer.doc),
  })
}

function onDelayChange(v: number | string | null) {
  let n = Math.round(Number(v))
  if (!Number.isFinite(n)) n = 100
  designer.doc.frameDelayMs = Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, n))
}

/* --- Import / export --- */

const fileInput = ref<HTMLInputElement | null>(null)

async function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const result = parseDesign(await file.text())
  if ('error' in result) {
    designer.toast(`Import failed: ${result.error}`)
    return
  }
  designer.replaceDoc(result.doc)
  designer.toast(`Imported "${result.doc.name}"`)
}

function onExport() {
  const blob = new Blob([JSON.stringify(designer.doc, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${designer.doc.name.replace(/[^a-zA-Z0-9_-]+/g, '_') || 'design'}.pxd`
  link.click()
  URL.revokeObjectURL(link.href)
}

/* --- Import image into current frame --- */

const imageInput = ref<HTMLInputElement | null>(null)
const importDialog = reactive({
  open: false,
  name: '',
  fit: 'cover' as ImageFit,
  smooth: true,
})
let importImage: DecodedImage | null = null
const importPreview = ref('')

function rerenderImportPreview() {
  if (!importImage) return
  try {
    importPreview.value = scaleToBitmapUrl(importImage, importDialog.fit, importDialog.smooth)
  } catch (err) {
    designer.toast(err instanceof Error ? err.message : String(err))
  }
}

async function onImportImageFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    importImage = await decodeImageFile(file)
  } catch (err) {
    designer.toast(
      `Could not import "${file.name}": ${err instanceof Error ? err.message : String(err)}`,
    )
    return
  }
  importDialog.name = file.name
  importDialog.fit = 'cover'
  importDialog.smooth = true
  importDialog.open = true
  rerenderImportPreview()
}

function confirmImportImage() {
  if (importPreview.value) {
    designer.snapshot(true)
    designer.setBitmapData(importPreview.value)
    designer.toast(`Imported "${importDialog.name}" into frame ${designer.frameIndex + 1}`)
  }
  importDialog.open = false
}

watch(
  () => [importDialog.fit, importDialog.smooth],
  () => rerenderImportPreview(),
)

watch(
  () => importDialog.open,
  (open) => {
    if (!open) {
      importImage = null
      importPreview.value = ''
    }
  },
)

/* --- Server-truth preview --- */

const previewFrames = ref<string[]>([])
const previewDelay = ref(100)
const previewError = ref('')
const previewIndex = ref(0)
let previewTimer: number | undefined
let previewSeq = 0
let previewDebounce: number | undefined

async function refreshPreview() {
  const seq = ++previewSeq
  const problem = validatePxd(designer.doc)
  if (problem) {
    previewError.value = problem
    return
  }
  try {
    const result = await previewCustomDesign(JSON.stringify(designer.doc))
    if (seq !== previewSeq) return
    previewError.value = ''
    previewFrames.value = result.frames
    previewDelay.value = result.frameDelayMs
    restartPlayback()
  } catch (err) {
    if (seq !== previewSeq) return
    previewError.value = err instanceof Error ? err.message : String(err)
  }
}

function restartPlayback() {
  if (previewTimer !== undefined) window.clearInterval(previewTimer)
  previewTimer = undefined
  previewIndex.value = 0
  if (previewFrames.value.length < 2) return
  previewTimer = window.setInterval(
    () => {
      previewIndex.value = (previewIndex.value + 1) % previewFrames.value.length
    },
    Math.max(10, previewDelay.value),
  )
}

watch(
  () => designer.doc,
  () => {
    if (previewDebounce) window.clearTimeout(previewDebounce)
    previewDebounce = window.setTimeout(refreshPreview, 500)
  },
  { deep: true, immediate: true },
)

/* --- Keyboard undo/redo --- */

function isTypingTarget(e: KeyboardEvent) {
  return Boolean((e.target as HTMLElement | null)?.closest?.('input, textarea, [contenteditable]'))
}

function onKeyDown(e: KeyboardEvent) {
  if (!e.ctrlKey && !e.metaKey) return
  if (isTypingTarget(e)) return
  if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault()
    designer.undo()
  } else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
    e.preventDefault()
    designer.redo()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  if (emitTimer) window.clearTimeout(emitTimer)
  if (previewDebounce) window.clearTimeout(previewDebounce)
  if (previewTimer !== undefined) window.clearInterval(previewTimer)
})
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <div class="d-flex ga-3 flex-wrap align-center">
      <v-text-field
        label="Design name"
        density="compact"
        hide-details
        :model-value="designer.doc.name"
        style="max-width: 220px"
        @update:model-value="(v) => (designer.doc.name = String(v || '').slice(0, 64))"
      />
      <v-text-field
        label="Duration (s)"
        type="number"
        density="compact"
        hide-details
        :model-value="modelValue.durationSeconds"
        style="max-width: 110px"
        @update:model-value="onDurationChange"
      />
      <v-text-field
        label="Frame delay (ms)"
        type="number"
        density="compact"
        hide-details
        :min="MIN_DELAY_MS"
        :max="MAX_DELAY_MS"
        :model-value="designer.doc.frameDelayMs"
        style="max-width: 140px"
        @update:model-value="onDelayChange"
      />
      <v-spacer />
      <v-btn
        size="small"
        variant="tonal"
        prepend-icon="mdi-image-plus"
        @click="imageInput?.click()"
      >
        Import image
      </v-btn>
      <v-btn size="small" variant="tonal" prepend-icon="mdi-import" @click="fileInput?.click()">
        Import .pxd
      </v-btn>
      <v-btn size="small" variant="tonal" prepend-icon="mdi-export" @click="onExport">
        Export .pxd
      </v-btn>
      <input
        ref="fileInput"
        type="file"
        accept=".pxd,application/json"
        style="display: none"
        @change="onImportFile"
      />
      <input
        ref="imageInput"
        type="file"
        accept="image/*"
        style="display: none"
        @change="onImportImageFile"
      />
    </div>

    <div class="d-flex ga-4 flex-wrap">
      <div class="d-flex flex-column ga-2" style="min-width: 420px; flex: 1 1 560px">
        <div class="d-flex ga-2 flex-wrap align-center">
          <v-btn-toggle v-model="designer.tool" density="compact" mandatory>
            <v-btn
              v-for="tool in tools"
              :key="tool.value"
              :value="tool.value"
              size="small"
              :icon="tool.icon"
              :title="tool.title"
            />
          </v-btn-toggle>
          <v-spacer />
          <v-btn
            size="small"
            variant="text"
            icon="mdi-undo"
            :disabled="!designer.canUndo"
            aria-label="Undo"
            @click="designer.undo()"
          />
          <v-btn
            size="small"
            variant="text"
            icon="mdi-redo"
            :disabled="!designer.canRedo"
            aria-label="Redo"
            @click="designer.redo()"
          />
        </div>
        <PixelCanvas :designer="designer" />
        <PalettePicker :designer="designer" />
      </div>

      <div class="d-flex flex-column ga-4" style="min-width: 300px; flex: 1 1 320px">
        <TextOverlayPanel :designer="designer" />
        <ParamOverlayPanel :designer="designer" />
        <FrameTimeline :designer="designer" />
      </div>
    </div>

    <div class="d-flex flex-column ga-2">
      <div class="text-subtitle-2">Preview (server rendered)</div>
      <v-alert v-if="previewError" type="error" density="compact">{{ previewError }}</v-alert>
      <img
        v-else-if="previewFrames.length"
        :src="previewFrames[previewIndex % previewFrames.length]"
        alt="Design preview"
        class="rounded"
        style="image-rendering: pixelated; width: 256px; height: 128px"
      />
    </div>

    <v-dialog v-model="importDialog.open" max-width="440px">
      <v-card>
        <v-card-title class="text-subtitle-1"
          >Import image into frame {{ designer.frameIndex + 1 }}</v-card-title
        >
        <v-card-text>
          <div class="text-caption text-medium-emphasis mb-2" style="overflow-wrap: anywhere">
            {{ importDialog.name }}
          </div>
          <img
            v-if="importPreview"
            :src="importPreview"
            alt="Import preview"
            class="rounded mb-4"
            style="image-rendering: pixelated; width: 256px; height: 128px"
          />
          <v-radio-group v-model="importDialog.fit" density="compact" hide-details>
            <v-radio
              v-for="option in IMAGE_FITS"
              :key="option.value"
              :value="option.value"
              :label="`${option.label} — ${option.hint}`"
            />
          </v-radio-group>
          <v-switch
            v-model="importDialog.smooth"
            density="compact"
            hide-details
            label="Smooth scaling (uncheck for pixel art)"
          />
          <div class="text-caption text-medium-emphasis mt-2">
            Replaces the pixels of the current frame; text overlays are kept. Undo with Ctrl+Z.
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="importDialog.open = false">Cancel</v-btn>
          <v-btn variant="tonal" prepend-icon="mdi-check" @click="confirmImportImage">
            Import into frame
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :timeout="2500">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>
