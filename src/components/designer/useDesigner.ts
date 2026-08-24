import { computed, reactive, ref } from 'vue'
import {
  blackBitmapUrl,
  hasParamLayers,
  MAX_FRAMES,
  MAX_PARAM_LAYERS,
  paramLayerCount,
  PXD_SCHEMA_VERSION,
  quantizeToRgb565,
  type PxdBlinkLayer,
  type PxdBitmapLayer,
  type PxdDoc,
  type PxdFrame,
  type PxdParamLayer,
  type PxdScrollLayer,
  type PxdSweepLayer,
  type PxdTextLayer,
} from '@/types/pxd.ts'

export type Tool =
  | 'brush'
  | 'eraser'
  | 'fill'
  | 'line'
  | 'rect'
  | 'rectFill'
  | 'circle'
  | 'circleFill'
  | 'eyedropper'
  | 'move'

type FrameStacks = { undo: string[]; redo: string[] }

const STACK_LIMIT = 50
const SNAPSHOT_COALESCE_MS = 400

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
export type PxdParamPatch = Partial<DistributiveOmit<PxdSweepLayer | PxdScrollLayer | PxdBlinkLayer, 'type'>>

export type Designer = {
  doc: PxdDoc
  frameIndex: number
  tool: Tool
  color: string
  onionSkin: boolean
  selectedLayer: number | null
  toastText: string
  toastSeq: number
  canUndo: boolean
  canRedo: boolean
  currentFrame(): PxdFrame
  bitmapUrl(): string
  frameBitmapUrl(index: number): string
  snapshot(force?: boolean): void
  setBitmapData(url: string): void
  textLayers(): { index: number; layer: PxdTextLayer }[]
  selectedTextLayer(): PxdTextLayer | null
  addText(): void
  updateText(index: number, patch: Partial<PxdTextLayer>): void
  nudgeSelectedText(dx: number, dy: number): void
  paramLayers(): { index: number; layer: PxdParamLayer }[]
  addSweep(): void
  addScroll(): void
  addBlink(): void
  updateParam(index: number, patch: PxdParamPatch): void
  overlayAnchor(): { x: number; y: number } | null
  setOverlayAnchor(x: number, y: number): void
  removeLayer(index: number): void
  selectLayer(index: number | null): void
  selectFrame(index: number): void
  setOnionSkin(value: boolean): void
  setColor(hex: string): void
  addFrame(): string | null
  duplicateFrame(): string | null
  deleteFrame(): string | null
  moveFrame(delta: number): void
  undo(): void
  redo(): void
  replaceDoc(doc: PxdDoc): void
  toast(text: string): void
}

export function createDesigner(doc: PxdDoc): Designer {
  const stacks = new Map<number, FrameStacks>()
  const undoDepth = ref(0)
  const redoDepth = ref(0)
  let lastSnapAt = 0

  const d: Designer = reactive({
    doc,
    frameIndex: 0,
    tool: 'brush',
    color: '#ffffff',
    onionSkin: false,
    selectedLayer: null,
    toastText: '',
    toastSeq: 0,
    canUndo: computed(() => undoDepth.value > 0),
    canRedo: computed(() => redoDepth.value > 0),
    currentFrame: () => {
      const i = Math.min(Math.max(d.frameIndex, 0), d.doc.frames.length - 1)
      return d.doc.frames[i] as PxdFrame
    },
    bitmapUrl: () => d.frameBitmapUrl(d.frameIndex),
    frameBitmapUrl: (index: number) => {
      const frame = d.doc.frames[index]
      if (!frame) return blackBitmapUrl()
      const bitmap = frame.layers.find((l): l is PxdBitmapLayer => l.type === 'bitmap')
      return bitmap?.data || blackBitmapUrl()
    },
    snapshot: (force = false) => {
      const now = Date.now()
      if (!force && now - lastSnapAt < SNAPSHOT_COALESCE_MS) return
      lastSnapAt = now
      const stack = stackFor(d.frameIndex)
      stack.undo.push(JSON.stringify(d.currentFrame().layers))
      if (stack.undo.length > STACK_LIMIT) stack.undo.shift()
      stack.redo.length = 0
      refreshDepths()
    },
    setBitmapData: (url: string) => {
      const frame = d.currentFrame()
      const bitmap = frame.layers.find((l): l is PxdBitmapLayer => l.type === 'bitmap')
      if (bitmap) {
        bitmap.data = url
        return
      }
      frame.layers.unshift({ type: 'bitmap', data: url })
      if (d.selectedLayer !== null) d.selectedLayer += 1
    },
    textLayers: () => {
      const out: { index: number; layer: PxdTextLayer }[] = []
      d.currentFrame().layers.forEach((layer, index) => {
        if (layer.type === 'text') out.push({ index, layer })
      })
      return out
    },
    selectedTextLayer: () => {
      if (d.selectedLayer === null) return null
      const layer = d.currentFrame().layers[d.selectedLayer]
      return layer && layer.type === 'text' ? layer : null
    },
    addText: () => {
      d.snapshot(true)
      d.currentFrame().layers.push({
        type: 'text',
        text: 'TEXT',
        x: 2,
        y: 2,
        color: d.color,
        font: 'CG_PIXEL',
      })
      d.selectedLayer = d.currentFrame().layers.length - 1
    },
    updateText: (index: number, patch: Partial<PxdTextLayer>) => {
      const layer = d.currentFrame().layers[index]
      if (!layer || layer.type !== 'text') return
      d.snapshot()
      if (patch.color !== undefined) patch.color = quantizeToRgb565(patch.color)
      Object.assign(layer, patch)
    },
    nudgeSelectedText: (dx: number, dy: number) => {
      const layer = d.selectedTextLayer()
      if (!layer) return
      d.snapshot()
      layer.x = Math.min(Math.max(layer.x + dx, 0), 63)
      layer.y = Math.min(Math.max(layer.y + dy, 0), 31)
    },
    paramLayers: () => {
      const out: { index: number; layer: PxdParamLayer }[] = []
      d.currentFrame().layers.forEach((layer, index) => {
        if (layer.type === 'sweep' || layer.type === 'scroll' || layer.type === 'blink')
          out.push({ index, layer })
      })
      return out
    },
    addSweep: () => addParamLayer({ type: 'sweep', cx: 32, cy: 16, r: 15, color: d.color, speedDegPerSec: 45 }),
    addScroll: () =>
      addParamLayer({
        type: 'scroll',
        x: 0,
        y: 24,
        w: 64,
        h: 8,
        text: 'SCROLLING TEXT',
        color: d.color,
        font: 'CG_PIXEL',
        speedMsPerPx: 120,
      }),
    addBlink: () => addParamLayer({ type: 'blink', x: 28, y: 12, w: 8, h: 8, periodMs: 1000 }),
    updateParam: (index: number, patch: PxdParamPatch) => {
      const layer = d.currentFrame().layers[index]
      if (!layer || (layer.type !== 'sweep' && layer.type !== 'scroll' && layer.type !== 'blink'))
        return
      d.snapshot()
      const loose = patch as Record<string, unknown>
      if (typeof loose.color === 'string') loose.color = quantizeToRgb565(loose.color)
      Object.assign(layer, patch)
    },
    overlayAnchor: () => {
      const layer = d.selectedLayer === null ? null : d.currentFrame().layers[d.selectedLayer]
      if (!layer) return null
      if (layer.type === 'text' || layer.type === 'scroll' || layer.type === 'blink')
        return { x: layer.x, y: layer.y }
      if (layer.type === 'sweep') return { x: layer.cx, y: layer.cy }
      return null
    },
    setOverlayAnchor: (x: number, y: number) => {
      const layer = d.selectedLayer === null ? null : d.currentFrame().layers[d.selectedLayer]
      if (!layer) return
      const cx = Math.min(Math.max(Math.round(x), 0), 63)
      const cy = Math.min(Math.max(Math.round(y), 0), 31)
      if (layer.type === 'text' || layer.type === 'scroll' || layer.type === 'blink') {
        layer.x = cx
        layer.y = cy
      } else if (layer.type === 'sweep') {
        layer.cx = cx
        layer.cy = cy
      }
    },
    removeLayer: (index: number) => {
      const frame = d.currentFrame()
      if (index < 0 || index >= frame.layers.length) return
      d.snapshot()
      frame.layers.splice(index, 1)
      if (d.selectedLayer === index) d.selectedLayer = null
      else if (d.selectedLayer !== null && d.selectedLayer > index) d.selectedLayer -= 1
    },
    selectLayer: (index: number | null) => {
      d.selectedLayer = index
      if (index !== null) d.tool = 'move'
    },
    selectFrame: (index: number) => {
      if (index >= 0 && index < d.doc.frames.length) {
        d.frameIndex = index
        d.selectedLayer = null
      }
    },
    setOnionSkin: (value: boolean) => {
      d.onionSkin = value
    },
    setColor: (hex: string) => {
      d.color = quantizeToRgb565(hex)
    },
    addFrame: () => {
      if (hasParamLayers(d.doc))
        return 'Remove the animation layers first — they need a single frame'
      if (d.doc.frames.length >= MAX_FRAMES) return `A design supports at most ${MAX_FRAMES} frames`
      clearStacks()
      d.doc.frames.push({ layers: [] })
      d.frameIndex = d.doc.frames.length - 1
      d.selectedLayer = null
      return null
    },
    duplicateFrame: () => {
      if (hasParamLayers(d.doc))
        return 'Remove the animation layers first — they need a single frame'
      if (d.doc.frames.length >= MAX_FRAMES) return `A design supports at most ${MAX_FRAMES} frames`
      clearStacks()
      const copy = JSON.parse(JSON.stringify(d.currentFrame())) as PxdFrame
      d.doc.frames.splice(d.frameIndex + 1, 0, copy)
      d.frameIndex += 1
      d.selectedLayer = null
      return null
    },
    deleteFrame: () => {
      if (d.doc.frames.length <= 1) return 'A design needs at least one frame'
      clearStacks()
      d.doc.frames.splice(d.frameIndex, 1)
      d.frameIndex = Math.min(d.frameIndex, d.doc.frames.length - 1)
      d.selectedLayer = null
      return null
    },
    moveFrame: (delta: number) => {
      const j = d.frameIndex + delta
      if (j < 0 || j >= d.doc.frames.length) return
      clearStacks()
      const [moved] = d.doc.frames.splice(d.frameIndex, 1)
      d.doc.frames.splice(j, 0, moved as PxdFrame)
      d.frameIndex = j
    },
    undo: () => {
      const stack = stackFor(d.frameIndex)
      const snap = stack.undo.pop()
      if (!snap) return
      stack.redo.push(JSON.stringify(d.currentFrame().layers))
      d.currentFrame().layers = JSON.parse(snap) as PxdFrame['layers']
      d.selectedLayer = null
      lastSnapAt = 0
      refreshDepths()
    },
    redo: () => {
      const stack = stackFor(d.frameIndex)
      const snap = stack.redo.pop()
      if (!snap) return
      stack.undo.push(JSON.stringify(d.currentFrame().layers))
      d.currentFrame().layers = JSON.parse(snap) as PxdFrame['layers']
      d.selectedLayer = null
      lastSnapAt = 0
      refreshDepths()
    },
    replaceDoc: (doc: PxdDoc) => {
      d.doc = doc
      d.frameIndex = 0
      d.selectedLayer = null
      clearStacks()
    },
    toast: (text: string) => {
      d.toastText = text
      d.toastSeq += 1
    },
  }) as unknown as Designer

  function stackFor(index: number): FrameStacks {
    let stack = stacks.get(index)
    if (!stack) {
      stack = { undo: [], redo: [] }
      stacks.set(index, stack)
    }
    return stack
  }

  /**
   * Parametric layers (pxd v2 §3.6): gated on the command-compilability rules — max 4,
   * single frame — and bump a v1 design to schemaVersion 2 (v2 is a superset, and the
   * layer types are v2-only).
   */
  function addParamLayer(layer: PxdParamLayer) {
    if (paramLayerCount(d.doc) >= MAX_PARAM_LAYERS) {
      d.toast(`A design supports at most ${MAX_PARAM_LAYERS} animation layers`)
      return
    }
    if (d.doc.frames.length > 1) {
      d.toast('Animation layers need a single frame — remove the extra frames first')
      return
    }
    if (d.doc.schemaVersion !== PXD_SCHEMA_VERSION) d.doc.schemaVersion = PXD_SCHEMA_VERSION
    d.snapshot(true)
    d.currentFrame().layers.push(layer)
    d.selectedLayer = d.currentFrame().layers.length - 1
  }

  function clearStacks() {
    stacks.clear()
    undoDepth.value = 0
    redoDepth.value = 0
    lastSnapAt = 0
  }

  function refreshDepths() {
    const stack = stackFor(d.frameIndex)
    undoDepth.value = stack.undo.length
    redoDepth.value = stack.redo.length
  }

  return d
}
