<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { PXD_FONTS } from '@/types/pxd.ts'
import { loadPxdFonts, pxdFontSpec } from './fonts.ts'
import type { Designer } from './useDesigner.ts'

const props = defineProps<{ designer: Designer }>()

const CELL = 12
const W = 64
const H = 32
const ERASER_COLOR = '#000000'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const offscreen = document.createElement('canvas')
offscreen.width = W
offscreen.height = H
const octx = offscreen.getContext('2d', { willReadFrequently: true })

type CachedImage = { source: CanvasImageSource; ok: boolean }
const imageCache = new Map<string, CachedImage>()
let loadToken = 0
let raf = 0

const drag = reactive({
  active: false,
  kind: '' as 'paint' | 'shape' | 'move' | '',
  color: '#ffffff',
  last: { x: 0, y: 0 },
  anchor: { x: 0, y: 0 },
  preview: { x: 0, y: 0 },
  moveFrom: { x: 0, y: 0, lx: 0, ly: 0 },
})

/**
 * Decodes without color-space conversion where possible: browsers with display color
 * management otherwise round-trip PNG pixels through the monitor profile, leaving ±1
 * RGB noise that breaks the flood fill's color matching (palette colors differ by ≥63).
 */
async function loadImage(url: string): Promise<CachedImage> {
  const cached = imageCache.get(url)
  if (cached?.ok) return cached
  if (typeof createImageBitmap === 'function') {
    try {
      const blob = await (await fetch(url)).blob()
      const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none' })
      const entry: CachedImage = { source: bitmap, ok: true }
      imageCache.set(url, entry)
      return entry
    } catch {
      // fall back to Image() below (also when the browser lacks the option)
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const entry: CachedImage = { source: img, ok: true }
      imageCache.set(url, entry)
      resolve(entry)
    }
    img.onerror = () => reject(new Error('image decode failed'))
    img.src = url
  })
}

function clearOffscreen() {
  if (!octx) return
  octx.fillStyle = '#000000'
  octx.fillRect(0, 0, W, H)
}

async function syncOffscreen() {
  const token = ++loadToken
  const url = props.designer.bitmapUrl()
  clearOffscreen()
  try {
    const img = await loadImage(url)
    if (token !== loadToken) return
    octx?.drawImage(img.source, 0, 0)
  } catch {
    if (token === loadToken) clearOffscreen()
  }
  requestRedraw()
}

function requestRedraw() {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    redraw()
  })
}

function redraw() {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (props.designer.onionSkin && props.designer.frameIndex > 0) {
    const prev = imageCache.get(props.designer.frameBitmapUrl(props.designer.frameIndex - 1))
    if (prev?.ok) {
      ctx.globalAlpha = 0.3
      ctx.drawImage(prev.source, 0, 0, canvas.width, canvas.height)
      ctx.globalAlpha = 1
    }
  }

  ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height)

  ctx.save()
  ctx.scale(CELL, CELL)
  ctx.textBaseline = 'top'
  for (const { index, layer } of props.designer.textLayers()) {
    ctx.font = pxdFontSpec(layer.font)
    ctx.fillStyle = layer.color
    ctx.fillText(layer.text, layer.x, layer.y)
    if (props.designer.selectedLayer === index) {
      const width = ctx.measureText(layer.text).width
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 0.15
      ctx.setLineDash([1, 1])
      ctx.strokeRect(layer.x - 0.5, layer.y - 0.5, width + 1, PXD_FONTS[layer.font].size + 1)
      ctx.setLineDash([])
    }
  }
  // Parametric layers (pxd v2): editor approximations — the θ=0 sweep line, the scroll's
  // head-hold text in its region, a dashed blink region. The server preview shows truth.
  for (const { index, layer } of props.designer.paramLayers()) {
    const selected = props.designer.selectedLayer === index
    if (layer.type === 'sweep') {
      ctx.strokeStyle = layer.color
      ctx.lineWidth = 0.3
      if (selected) ctx.setLineDash([1, 1])
      ctx.beginPath()
      ctx.moveTo(layer.cx, layer.cy + 0.5)
      ctx.lineTo(layer.cx + layer.r, layer.cy + 0.5)
      ctx.stroke()
      if (selected) {
        ctx.strokeStyle = '#ff0000'
        ctx.lineWidth = 0.15
        ctx.beginPath()
        ctx.arc(layer.cx, layer.cy, layer.r + 0.5, 0, 2 * Math.PI)
        ctx.stroke()
        ctx.setLineDash([])
      }
    } else {
      ctx.strokeStyle = selected ? '#ff0000' : layer.type === 'blink' ? '#ffcc00' : layer.color
      ctx.lineWidth = 0.15
      ctx.setLineDash([1, 1])
      ctx.strokeRect(layer.x - 0.5, layer.y - 0.5, layer.w + 1, layer.h + 1)
      ctx.setLineDash([])
      if (layer.type === 'scroll') {
        ctx.save()
        ctx.beginPath()
        ctx.rect(layer.x, layer.y, layer.w, layer.h)
        ctx.clip()
        ctx.fillStyle = layer.color
        ctx.font = pxdFontSpec(layer.font)
        ctx.fillText(layer.text, layer.x, layer.y)
        ctx.restore()
      }
    }
  }
  ctx.restore()

  if (drag.active && drag.kind === 'shape') drawShapePreview(ctx)

  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 1; x < W; x++) {
    ctx.moveTo(x * CELL + 0.5, 0)
    ctx.lineTo(x * CELL + 0.5, canvas.height)
  }
  for (let y = 1; y < H; y++) {
    ctx.moveTo(0, y * CELL + 0.5)
    ctx.lineTo(canvas.width, y * CELL + 0.5)
  }
  ctx.stroke()
}

function drawShapePreview(ctx: CanvasRenderingContext2D) {
  const color = props.designer.tool === 'eraser' ? ERASER_COLOR : props.designer.color
  ctx.fillStyle = color
  for (const { x, y } of shapePixels()) ctx.fillRect(x * CELL, y * CELL, CELL, CELL)
}

function shapePixels(): { x: number; y: number }[] {
  const { x: x0, y: y0 } = drag.anchor
  const { x: x1, y: y1 } = drag.preview
  const tool = props.designer.tool
  if (tool === 'line') return linePixels(x0, y0, x1, y1)
  if (tool === 'rect' || tool === 'rectFill') {
    const rx0 = Math.min(x0, x1)
    const ry0 = Math.min(y0, y1)
    const rx1 = Math.max(x0, x1)
    const ry1 = Math.max(y0, y1)
    const pixels: { x: number; y: number }[] = []
    for (let y = ry0; y <= ry1; y++)
      for (let x = rx0; x <= rx1; x++)
        if (tool === 'rectFill' || x === rx0 || x === rx1 || y === ry0 || y === ry1)
          pixels.push({ x, y })
    return pixels
  }
  const r = Math.round(Math.hypot(x1 - x0, y1 - y0))
  if (props.designer.tool === 'circleFill') {
    const pixels: { x: number; y: number }[] = []
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++)
        if (dx * dx + dy * dy <= r * r) pixels.push({ x: x0 + dx, y: y0 + dy })
    return pixels
  }
  const pixels: { x: number; y: number }[] = []
  let cx = 0
  let cy = r
  let d = 3 - 2 * r
  const octant = (dx: number, dy: number) => {
    pixels.push({ x: x0 + dx, y: y0 + dy }, { x: x0 - dx, y: y0 + dy })
    pixels.push({ x: x0 + dx, y: y0 - dy }, { x: x0 - dx, y: y0 - dy })
    pixels.push({ x: x0 + dy, y: y0 + dx }, { x: x0 - dy, y: y0 + dx })
    pixels.push({ x: x0 + dy, y: y0 - dx }, { x: x0 - dy, y: y0 - dx })
  }
  while (cx <= cy) {
    octant(cx, cy)
    if (d < 0) d += 4 * cx + 6
    else {
      d += 4 * (cx - cy) + 10
      cy -= 1
    }
    cx += 1
  }
  return pixels
}

function linePixels(x0: number, y0: number, x1: number, y1: number) {
  const pixels: { x: number; y: number }[] = []
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  let x = x0
  let y = y0
  for (;;) {
    pixels.push({ x, y })
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
  return pixels
}

function cellFromEvent(e: PointerEvent) {
  const canvas = canvasRef.value
  if (!canvas) return { x: 0, y: 0 }
  const rect = canvas.getBoundingClientRect()
  const x = Math.floor(((e.clientX - rect.left) / rect.width) * W)
  const y = Math.floor(((e.clientY - rect.top) / rect.height) * H)
  return { x: Math.min(Math.max(x, 0), W - 1), y: Math.min(Math.max(y, 0), H - 1) }
}

function paintCell(x: number, y: number, color: string) {
  if (!octx) return
  octx.fillStyle = color
  octx.fillRect(x, y, 1, 1)
}

/** Pixel colors within this distance per channel count as the same surface color. */
const FILL_TOLERANCE = 2

function floodFill(x: number, y: number, color: string) {
  if (!octx) return
  const data = octx.getImageData(0, 0, W, H)
  const px = data.data
  const idx = (cx: number, cy: number) => (cy * W + cx) * 4
  const start = idx(x, y)
  const target = [px[start], px[start + 1], px[start + 2]]
  const fill = hexToRgb(color)
  if (target[0] === fill[0] && target[1] === fill[1] && target[2] === fill[2]) return
  const near = (r: number, g: number, b: number) =>
    Math.abs(r - target[0]) <= FILL_TOLERANCE &&
    Math.abs(g - target[1]) <= FILL_TOLERANCE &&
    Math.abs(b - target[2]) <= FILL_TOLERANCE
  const visited = new Uint8Array(W * H)
  const queue: number[] = [x, y]
  while (queue.length) {
    const cy = queue.pop() as number
    const cx = queue.pop() as number
    const p = cy * W + cx
    if (visited[p]) continue
    visited[p] = 1
    const i = idx(cx, cy)
    if (!near(px[i], px[i + 1], px[i + 2])) continue
    px[i] = fill[0]
    px[i + 1] = fill[1]
    px[i + 2] = fill[2]
    px[i + 3] = 255
    if (cx > 0) queue.push(cx - 1, cy)
    if (cx < W - 1) queue.push(cx + 1, cy)
    if (cy > 0) queue.push(cx, cy - 1)
    if (cy < H - 1) queue.push(cx, cy + 1)
  }
  octx.putImageData(data, 0, 0)
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

function commitOffscreen() {
  props.designer.setBitmapData(offscreen.toDataURL('image/png'))
}

function onPointerDown(e: PointerEvent) {
  const cell = cellFromEvent(e)
  const tool = props.designer.tool
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)

  if (tool === 'eyedropper') {
    const pixel = octx?.getImageData(cell.x, cell.y, 1, 1).data
    if (pixel)
      props.designer.setColor(
        `#${[pixel[0], pixel[1], pixel[2]].map((n) => n.toString(16).padStart(2, '0')).join('')}`,
      )
    return
  }

  if (tool === 'move') {
    const anchor = props.designer.overlayAnchor()
    if (!anchor) return
    drag.active = true
    drag.kind = 'move'
    drag.moveFrom = { x: cell.x, y: cell.y, lx: anchor.x, ly: anchor.y }
    props.designer.snapshot(true)
    return
  }

  if (tool === 'fill') {
    props.designer.snapshot(true)
    floodFill(cell.x, cell.y, props.designer.color)
    commitOffscreen()
    requestRedraw()
    return
  }

  if (tool === 'brush' || tool === 'eraser') {
    drag.active = true
    drag.kind = 'paint'
    drag.color = tool === 'eraser' ? ERASER_COLOR : props.designer.color
    drag.last = cell
    props.designer.snapshot(true)
    paintCell(cell.x, cell.y, drag.color)
    requestRedraw()
    return
  }

  drag.active = true
  drag.kind = 'shape'
  drag.anchor = cell
  drag.preview = cell
  requestRedraw()
}

function onPointerMove(e: PointerEvent) {
  if (!drag.active) return
  const cell = cellFromEvent(e)
  if (drag.kind === 'paint') {
    for (const { x, y } of linePixels(drag.last.x, drag.last.y, cell.x, cell.y))
      paintCell(x, y, drag.color)
    drag.last = cell
    requestRedraw()
    return
  }
  if (drag.kind === 'shape') {
    drag.preview = cell
    requestRedraw()
    return
  }
  if (drag.kind === 'move') {
    if (!props.designer.overlayAnchor()) return
    props.designer.setOverlayAnchor(
      drag.moveFrom.lx + (cell.x - drag.moveFrom.x),
      drag.moveFrom.ly + (cell.y - drag.moveFrom.y),
    )
    requestRedraw()
  }
}

function onPointerUp() {
  if (!drag.active) return
  if (drag.kind === 'paint') {
    commitOffscreen()
  } else if (drag.kind === 'shape') {
    props.designer.snapshot(true)
    const pixels = shapePixels()
    const color = props.designer.tool === 'eraser' ? ERASER_COLOR : props.designer.color
    for (const { x, y } of pixels) paintCell(x, y, color)
    commitOffscreen()
  }
  drag.active = false
  drag.kind = ''
  requestRedraw()
}

watch(
  () => [props.designer.bitmapUrl(), props.designer.frameIndex],
  () => syncOffscreen(),
)
watch(
  () => [
    props.designer.onionSkin,
    props.designer.selectedLayer,
    props.designer.currentFrame().layers,
  ],
  () => requestRedraw(),
  { deep: true },
)
watch(
  () => props.designer.tool,
  () => {
    if (drag.active) return
    requestRedraw()
  },
)

onMounted(() => {
  syncOffscreen()
  loadPxdFonts().then(requestRedraw)
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
})
</script>

<template>
  <canvas
    ref="canvasRef"
    :width="64 * 12"
    :height="32 * 12"
    class="designer-canvas rounded"
    style="width: 100%; max-width: 768px; touch-action: none; cursor: crosshair"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  />
</template>

<style scoped>
.designer-canvas {
  image-rendering: pixelated;
  border: 1px solid rgba(128, 128, 128, 0.4);
}
</style>
