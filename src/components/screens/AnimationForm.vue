<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { AnyScreen } from '@/registry/screensRegistry.ts'

type T = Extract<AnyScreen, { screenType: 'ANIMATION' }>

/**
 * ANIMATION screens are capped at 60 frames (server-validated); GIFs are auto-trimmed
 * to the first 60. The MQTT protocol wire cap remains 200 for other screen types.
 */
const MIN_FRAMES = 2
const MAX_FRAMES = 60
const MIN_DELAY_MS = 10
const MAX_DELAY_MS = 65535

const props = defineProps<{ modelValue: T }>()
const emit = defineEmits<{ 'update:modelValue': [T] }>()

function update(patch: Partial<T>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

const fileModel = ref<File | File[] | null>(null)
const resetKey = ref(0)
const snackbar = reactive({ show: false, text: '' })
const toast = (t: string) => ((snackbar.text = t), (snackbar.show = true))

function toUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

/** Draw any image source onto a 64x32 canvas (nearest neighbor) as a data URL. */
function to64x32DataUrl(source: CanvasImageSource): string {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 32
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2D canvas context')
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(source, 0, 0, 64, 32)
  return canvas.toDataURL('image/png')
}

/* --- GIF splitting via the WebCodecs ImageDecoder API (Chromium/Firefox) --- */

interface DecodedFrame {
  image: CanvasImageSource & { close?: () => void }
}
interface ImageDecoderLike {
  tracks: { ready: Promise<unknown>; selectedTrack: { frameCount: number } | null }
  decode(options: { frameIndex: number }): Promise<DecodedFrame>
  close(): void
}
type ImageDecoderCtor = new (init: { data: BufferSource; type: string }) => ImageDecoderLike

function getImageDecoder(): ImageDecoderCtor | undefined {
  const ctor = (globalThis as unknown as Record<string, unknown>)['ImageDecoder']
  return typeof ctor === 'function' ? (ctor as ImageDecoderCtor) : undefined
}

async function splitGif(file: File): Promise<string[]> {
  const Decoder = getImageDecoder()
  if (!Decoder) {
    alert(
      'This browser cannot split GIFs automatically. Export the frames as individual 64x32 images and upload those instead.',
    )
    return []
  }

  let frames: string[] = []
  try {
    const decoder = new Decoder({ data: await file.arrayBuffer(), type: 'image/gif' })
    await decoder.tracks.ready
    const track = decoder.tracks.selectedTrack
    if (!track) throw new Error('GIF contains no image track')
    const total = track.frameCount
    for (let i = 0; i < total && frames.length < MAX_FRAMES; i++) {
      const { image } = await decoder.decode({ frameIndex: i })
      frames.push(to64x32DataUrl(image))
      image.close?.()
    }
    decoder.close()

    if (frames.length < MIN_FRAMES) {
      alert(`"${file.name}" has fewer than ${MIN_FRAMES} frames; skipped.`)
      return []
    }
    if (total > MAX_FRAMES) {
      toast(`GIF has ${total} frames; it was auto-trimmed to the first ${MAX_FRAMES} frames.`)
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    alert(`Could not decode "${file.name}" as GIF (${reason}); skipped.`)
    frames = []
  }
  return frames
}

async function onFilesChange(v: File | File[] | null) {
  const files = Array.isArray(v) ? v : v ? [v] : null
  fileModel.value = null
  resetKey.value++
  if (!files?.length) return

  const added: string[] = []
  for (const file of files) {
    if (file.type === 'image/gif') {
      added.push(...(await splitGif(file)))
      continue
    }

    const url = await toUrl(file)
    const img = await loadImage(url).catch(() => null)
    if (!img || img.width !== 64 || img.height !== 32) {
      alert(`"${file.name}" skipped: frames must be exactly 64x32 pixels.`)
      continue
    }
    added.push(url)
  }

  if (!added.length) return

  const frames = [...props.modelValue.frames, ...added]
  if (frames.length > MAX_FRAMES) {
    toast(
      `An animation supports at most ${MAX_FRAMES} frames; it was auto-trimmed to the first ${MAX_FRAMES}.`,
    )
    frames.length = MAX_FRAMES
  }
  update({ frames })
}

function removeFrame(i: number) {
  const frames = [...props.modelValue.frames]
  frames.splice(i, 1)
  update({ frames })
}

function moveFrame(i: number, delta: number) {
  const j = i + delta
  const frames = [...props.modelValue.frames]
  if (j < 0 || j >= frames.length) return
  const [moved] = frames.splice(i, 1)
  frames.splice(j, 0, moved)
  update({ frames })
}

function clearFrames() {
  update({ frames: [] })
}

function onDelayChange(v: number | string | null) {
  let n = Math.round(Number(v))
  if (!Number.isFinite(n)) n = 100
  update({ frameDelayMs: Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, n)) })
}

/* --- Animated preview --- */

const previewIndex = ref(0)
let timer: number | undefined

const previewFrame = computed(() => {
  const list = props.modelValue.frames
  if (!list.length) return ''
  return list[previewIndex.value % list.length]
})

function restartPreview() {
  if (timer !== undefined) window.clearInterval(timer)
  timer = undefined
  previewIndex.value = 0
  if (props.modelValue.frames.length < 2) return
  timer = window.setInterval(
    () => {
      previewIndex.value = (previewIndex.value + 1) % props.modelValue.frames.length
    },
    Math.max(10, props.modelValue.frameDelayMs),
  )
}

watch([() => props.modelValue.frames, () => props.modelValue.frameDelayMs], restartPreview, {
  immediate: true,
})

onBeforeUnmount(() => {
  if (timer !== undefined) window.clearInterval(timer)
})
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <v-file-input
      :key="resetKey"
      v-model="fileModel"
      label="Add frames (images or GIF)"
      accept="image/*"
      prepend-icon="mdi-movie-open"
      multiple
      show-size
      counter
      @update:model-value="onFilesChange"
      hint="Individual 64x32 images, or one GIF which is split into frames automatically."
      persistent-hint
    />

    <v-text-field
      type="number"
      label="Frame delay (ms)"
      :model-value="modelValue.frameDelayMs"
      :min="MIN_DELAY_MS"
      :max="MAX_DELAY_MS"
      @update:model-value="onDelayChange"
      hint="Applies to every frame (10-65535 ms)."
      persistent-hint
    />

    <div v-if="modelValue.frames.length" class="d-flex flex-column ga-2">
      <div class="text-subtitle-2">Preview ({{ modelValue.frames.length }} frames)</div>
      <img
        v-if="previewFrame"
        :src="previewFrame"
        alt="Animation preview"
        class="rounded"
        style="image-rendering: pixelated; width: 256px; height: 128px"
      />
    </div>

    <v-table v-if="modelValue.frames.length" density="compact">
      <thead>
        <tr>
          <th class="text-left" style="width: 80px">Frame</th>
          <th class="text-left">Thumb</th>
          <th class="text-right" style="width: 120px">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(f, i) in modelValue.frames" :key="i">
          <td>{{ i + 1 }}</td>
          <td>
            <img
              :src="f"
              :alt="`Frame ${i + 1}`"
              style="image-rendering: pixelated; height: 32px; width: 64px"
            />
          </td>
          <td class="text-right">
            <v-btn
              size="x-small"
              variant="text"
              icon="mdi-arrow-up"
              :disabled="i === 0"
              :aria-label="`Move frame ${i + 1} up`"
              @click="moveFrame(i, -1)"
            />
            <v-btn
              size="x-small"
              variant="text"
              icon="mdi-arrow-down"
              :disabled="i === modelValue.frames.length - 1"
              :aria-label="`Move frame ${i + 1} down`"
              @click="moveFrame(i, 1)"
            />
            <v-btn
              size="x-small"
              variant="text"
              icon="mdi-close"
              color="error"
              :aria-label="`Remove frame ${i + 1}`"
              @click="removeFrame(i)"
            />
          </td>
        </tr>
      </tbody>
    </v-table>

    <div v-if="modelValue.frames.length" class="d-flex ga-2">
      <v-btn size="small" variant="text" color="error" @click="clearFrames">Clear all</v-btn>
    </div>

    <v-snackbar v-model="snackbar.show" :timeout="2500">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>
