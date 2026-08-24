export type PxdBitmapLayer = { type: 'bitmap'; data: string }
export type PxdTextLayer = {
  type: 'text'
  text: string
  x: number
  y: number
  color: string
  font: PxdFontId
}
export type PxdRectLayer = {
  type: 'rect'
  x: number
  y: number
  w: number
  h: number
  color: string
  filled: boolean
}
export type PxdLineLayer = {
  type: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
}
export type PxdCircleLayer = {
  type: 'circle'
  cx: number
  cy: number
  r: number
  color: string
  filled: boolean
}
/** pxd v2 parametric (spec §3.6): rotating radar-style line, ticked on the panel itself. */
export type PxdSweepLayer = {
  type: 'sweep'
  cx: number
  cy: number
  r: number
  color: string
  speedDegPerSec: number
}
/** pxd v2 parametric: ping-pong marquee text clipped to a region; y = glyph line-box top. */
export type PxdScrollLayer = {
  type: 'scroll'
  x: number
  y: number
  w: number
  h: number
  text: string
  color: string
  font: PxdFontId
  speedMsPerPx: number
}
/** pxd v2 parametric: region alternates its base content and black every periodMs/2. */
export type PxdBlinkLayer = {
  type: 'blink'
  x: number
  y: number
  w: number
  h: number
  periodMs: number
}
export type PxdParamLayer = PxdSweepLayer | PxdScrollLayer | PxdBlinkLayer
export type PxdLayer =
  | PxdBitmapLayer
  | PxdTextLayer
  | PxdRectLayer
  | PxdLineLayer
  | PxdCircleLayer
  | PxdSweepLayer
  | PxdScrollLayer
  | PxdBlinkLayer
export type PxdFrame = { layers: PxdLayer[] }
export type PxdDoc = {
  schemaVersion: number
  name: string
  frameDelayMs: number
  frames: PxdFrame[]
}

export const PXD_SCHEMA_VERSION = 2
export const SUPPORTED_SCHEMA_VERSIONS = [1, 2] as const
export const MIN_FRAMES = 1
export const MAX_FRAMES = 60
export const MIN_DELAY_MS = 10
export const MAX_DELAY_MS = 65535
export const MAX_DESIGN_CHARS = 512 * 1024
export const MAX_TEXT_CHARS = 255
/** ACMD parametric caps for designs carrying any animation layer (spec §3.4.7). */
export const MAX_PARAM_LAYERS = 4
export const MAX_COMMAND_FONTS = 4
export const MAX_COORD = 255
export const MIN_SWEEP_SPEED = 1
export const MAX_SWEEP_SPEED = 255
export const MIN_SCROLL_SPEED = 1
export const MAX_SCROLL_SPEED = 65535
export const MIN_BLINK_PERIOD = 2
export const MAX_BLINK_PERIOD = 65535
const COLOR_RE = /^#[0-9a-fA-F]{6}$/
const PARAM_TYPES = ['sweep', 'scroll', 'blink'] as const

export const FONT_IDS = [
  'CG_PIXEL',
  'MINI_LINE',
  'HABBO',
  'LED_BOARD',
  'TINY',
  'FROST',
  'GRINCHED',
] as const
export type PxdFontId = (typeof FONT_IDS)[number]

export const FONT_LABELS: Record<PxdFontId, string> = {
  CG_PIXEL: 'CG Pixel 4x5',
  MINI_LINE: 'MiniLine 8px',
  HABBO: 'Habbo',
  LED_BOARD: 'LED Board',
  TINY: 'Tiny Unicode',
  FROST: 'Frost',
  GRINCHED: 'Grinched',
}

/**
 * Font size registry mirror of the server's PaintConfig (pxd spec §3.3): per id the px
 * size the server derives the AWT font with (AWT at identity transform: 1pt = 1px, so
 * these are canvas px sizes). The TTFs themselves are bundled in
 * `src/components/designer/fonts.ts`.
 */
export const PXD_FONTS: Record<PxdFontId, { size: number }> = {
  CG_PIXEL: { size: 5 },
  MINI_LINE: { size: 8 },
  HABBO: { size: 16 },
  LED_BOARD: { size: 16 },
  TINY: { size: 16 },
  FROST: { size: 7 },
  GRINCHED: { size: 9 },
}

export const PALETTE_16 = [
  '#000000',
  '#ffffff',
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#ffff00',
  '#00ffff',
  '#ff00ff',
  '#ff8000',
  '#ff80c0',
  '#80ff00',
  '#008080',
  '#000080',
  '#800000',
  '#800080',
  '#c0c0c0',
]

export function quantizeToRgb565(hex: string): string {
  const safe = COLOR_RE.test(hex) ? hex : '#000000'
  const r = parseInt(safe.slice(1, 3), 16)
  const g = parseInt(safe.slice(3, 5), 16)
  const b = parseInt(safe.slice(5, 7), 16)
  const r5 = Math.floor((r * 31 + 127) / 255)
  const g6 = Math.floor((g * 63 + 127) / 255)
  const b5 = Math.floor((b * 31 + 127) / 255)
  const rr = Math.round((r5 * 255) / 31)
  const gg = Math.round((g6 * 255) / 63)
  const bb = Math.round((b5 * 255) / 31)
  const h = (n: number) => n.toString(16).padStart(2, '0')
  return `#${h(rr)}${h(gg)}${h(bb)}`
}

let blackUrl: string | null = null
export function blackBitmapUrl(): string {
  if (!blackUrl) {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 32
    canvas.getContext('2d')?.fillRect(0, 0, 64, 32)
    blackUrl = canvas.toDataURL('image/png')
  }
  return blackUrl
}

export function emptyDesign(name = 'My design'): PxdDoc {
  return {
    schemaVersion: PXD_SCHEMA_VERSION,
    name,
    frameDelayMs: 100,
    frames: [{ layers: [] }],
  }
}

export function cloneDoc(doc: PxdDoc): PxdDoc {
  return JSON.parse(JSON.stringify(doc)) as PxdDoc
}

export function isParamLayer(layer: PxdLayer): layer is PxdParamLayer {
  return PARAM_TYPES.includes(layer.type as (typeof PARAM_TYPES)[number])
}

export function hasParamLayers(doc: PxdDoc): boolean {
  return doc.frames.some((f) => f.layers.some(isParamLayer))
}

export function paramLayerCount(doc: PxdDoc): number {
  return doc.frames.reduce((n, f) => n + f.layers.filter(isParamLayer).length, 0)
}

/**
 * Client-side pre-check mirroring the server's parse (spec §3.4). The one rule that
 * cannot run here: a bitmap's ≤16 distinct RGB565 colors in parametric designs — the
 * PNG is only decodable server-side, so that surfaces via the preview's 400 message.
 */
export function validatePxd(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return 'design must be a JSON object'
  const doc = value as Partial<PxdDoc> & Record<string, unknown>
  if (
    typeof doc.schemaVersion !== 'number' ||
    !SUPPORTED_SCHEMA_VERSIONS.includes(doc.schemaVersion as 1 | 2)
  )
    return `unsupported schemaVersion ${String(doc.schemaVersion)} (expected ${SUPPORTED_SCHEMA_VERSIONS.join(' or ')})`
  if (typeof doc.name !== 'string' || doc.name.length < 1 || doc.name.length > 64)
    return 'name must be 1-64 characters'
  if (doc.frameDelayMs !== undefined) {
    if (
      typeof doc.frameDelayMs !== 'number' ||
      !Number.isInteger(doc.frameDelayMs) ||
      doc.frameDelayMs < MIN_DELAY_MS ||
      doc.frameDelayMs > MAX_DELAY_MS
    )
      return `frameDelayMs must be an integer ${MIN_DELAY_MS}-${MAX_DELAY_MS}`
  }
  if (!Array.isArray(doc.frames)) return 'frames must be an array'
  if (doc.frames.length < MIN_FRAMES || doc.frames.length > MAX_FRAMES)
    return `frames must contain ${MIN_FRAMES}-${MAX_FRAMES} frames`
  let paramCount = 0
  const fonts = new Set<string>()
  let hasParams = false
  for (let f = 0; f < doc.frames.length; f++) {
    const frame = doc.frames[f] as Partial<PxdFrame> & Record<string, unknown>
    if (typeof frame !== 'object' || frame === null || !Array.isArray(frame.layers))
      return `frame ${f}: layers must be an array`
    for (let l = 0; l < frame.layers.length; l++) {
      const layer = frame.layers[l] as Record<string, unknown>
      const at = `frame ${f} layer ${l}`
      switch (layer.type) {
        case 'bitmap':
          if (typeof layer.data !== 'string' || !layer.data.startsWith('data:image/png;base64,'))
            return `${at}: bitmap data must be a PNG data URL`
          break
        case 'text':
          if (
            typeof layer.text !== 'string' ||
            layer.text.length < 1 ||
            layer.text.length > MAX_TEXT_CHARS
          )
            return `${at}: text must be 1-${MAX_TEXT_CHARS} characters`
          if (!FONT_IDS.includes(layer.font as PxdFontId))
            return `${at}: unknown font ${String(layer.font)}`
          if (!isInt(layer.x) || !isInt(layer.y)) return `${at}: x and y must be integers`
          if (!isColor(layer.color)) return `${at}: color must be #RRGGBB`
          break
        case 'rect':
          if (!isInt(layer.x) || !isInt(layer.y) || !isInt(layer.w) || !isInt(layer.h))
            return `${at}: x, y, w and h must be integers`
          if (
            typeof layer.w !== 'number' ||
            layer.w < 1 ||
            typeof layer.h !== 'number' ||
            layer.h < 1
          )
            return `${at}: w and h must be >= 1`
          if (typeof layer.filled !== 'boolean') return `${at}: filled must be a boolean`
          if (!isColor(layer.color)) return `${at}: color must be #RRGGBB`
          break
        case 'line':
          if (!isInt(layer.x1) || !isInt(layer.y1) || !isInt(layer.x2) || !isInt(layer.y2))
            return `${at}: coordinates must be integers`
          if (!isColor(layer.color)) return `${at}: color must be #RRGGBB`
          break
        case 'circle':
          if (!isInt(layer.cx) || !isInt(layer.cy)) return `${at}: cx and cy must be integers`
          if (typeof layer.r !== 'number' || !Number.isInteger(layer.r) || layer.r < 0)
            return `${at}: r must be an integer >= 0`
          if (typeof layer.filled !== 'boolean') return `${at}: filled must be a boolean`
          if (!isColor(layer.color)) return `${at}: color must be #RRGGBB`
          break
        case 'sweep':
        case 'scroll':
        case 'blink': {
          if (doc.schemaVersion !== 2)
            return `${at}: layer type '${layer.type}' requires schemaVersion 2`
          hasParams = true
          paramCount++
          if (paramCount > MAX_PARAM_LAYERS)
            return `a design supports at most ${MAX_PARAM_LAYERS} parametric layers`
          if (layer.type === 'sweep') {
            if (!isInt(layer.cx) || !isInt(layer.cy)) return `${at}: cx and cy must be integers`
            if (typeof layer.r !== 'number' || !Number.isInteger(layer.r) || layer.r < 0)
              return `${at}: r must be an integer >= 0`
            if (!isColor(layer.color)) return `${at}: color must be #RRGGBB`
            if (
              typeof layer.speedDegPerSec !== 'number' ||
              !Number.isInteger(layer.speedDegPerSec) ||
              layer.speedDegPerSec < MIN_SWEEP_SPEED ||
              layer.speedDegPerSec > MAX_SWEEP_SPEED
            )
              return `${at}: speedDegPerSec must be an integer ${MIN_SWEEP_SPEED}-${MAX_SWEEP_SPEED}`
          } else if (layer.type === 'scroll') {
            if (!isInt(layer.x) || !isInt(layer.y) || !isInt(layer.w) || !isInt(layer.h))
              return `${at}: x, y, w and h must be integers`
            if (
              typeof layer.w !== 'number' ||
              layer.w < 1 ||
              typeof layer.h !== 'number' ||
              layer.h < 1
            )
              return `${at}: w and h must be >= 1`
            if (
              typeof layer.text !== 'string' ||
              layer.text.length < 1 ||
              layer.text.length > MAX_TEXT_CHARS
            )
              return `${at}: text must be 1-${MAX_TEXT_CHARS} characters`
            if (layer.font !== undefined && !FONT_IDS.includes(layer.font as PxdFontId))
              return `${at}: unknown font ${String(layer.font)}`
            if (!isColor(layer.color)) return `${at}: color must be #RRGGBB`
            if (
              typeof layer.speedMsPerPx !== 'number' ||
              !Number.isInteger(layer.speedMsPerPx) ||
              layer.speedMsPerPx < MIN_SCROLL_SPEED ||
              layer.speedMsPerPx > MAX_SCROLL_SPEED
            )
              return `${at}: speedMsPerPx must be an integer ${MIN_SCROLL_SPEED}-${MAX_SCROLL_SPEED}`
          } else {
            if (!isInt(layer.x) || !isInt(layer.y) || !isInt(layer.w) || !isInt(layer.h))
              return `${at}: x, y, w and h must be integers`
            if (
              typeof layer.w !== 'number' ||
              layer.w < 1 ||
              typeof layer.h !== 'number' ||
              layer.h < 1
            )
              return `${at}: w and h must be >= 1`
            if (
              typeof layer.periodMs !== 'number' ||
              !Number.isInteger(layer.periodMs) ||
              layer.periodMs < MIN_BLINK_PERIOD ||
              layer.periodMs > MAX_BLINK_PERIOD
            )
              return `${at}: periodMs must be an integer ${MIN_BLINK_PERIOD}-${MAX_BLINK_PERIOD}`
          }
          break
        }
        default:
          return `${at}: unknown layer type ${String(layer.type)}`
      }
      if (layer.type === 'text' && FONT_IDS.includes(layer.font as PxdFontId)) {
        fonts.add(layer.font as string)
      }
      if (layer.type === 'scroll') {
        fonts.add(layer.font === undefined ? 'CG_PIXEL' : (layer.font as string))
      }
    }
  }
  if (hasParams) {
    if (doc.frames.length !== 1)
      return 'parametric layers require a single frame — remove extra frames or animation layers'
    if (fonts.size > MAX_COMMAND_FONTS)
      return `a design with parametric layers supports at most ${MAX_COMMAND_FONTS} distinct fonts across text and scroll layers`
    for (const frame of doc.frames) {
      for (const layer of (frame as PxdFrame).layers) {
        for (const coord of layerCoords(layer)) {
          if (coord < 0 || coord > MAX_COORD)
            return `coordinates of a parametric design must be within 0-${MAX_COORD}`
        }
      }
    }
  }
  return null
}

/** Positional integers of a layer (colors/speeds excluded) — mirrors the server's rule. */
function layerCoords(layer: PxdLayer): number[] {
  switch (layer.type) {
    case 'bitmap':
      return []
    case 'text':
      return [layer.x, layer.y]
    case 'rect':
      return [layer.x, layer.y, layer.w, layer.h]
    case 'line':
      return [layer.x1, layer.y1, layer.x2, layer.y2]
    case 'circle':
      return [layer.cx, layer.cy, layer.r]
    case 'sweep':
      return [layer.cx, layer.cy, layer.r]
    case 'scroll':
      return [layer.x, layer.y, layer.w, layer.h]
    case 'blink':
      return [layer.x, layer.y, layer.w, layer.h]
  }
}

export function parseDesign(json: string): { doc: PxdDoc } | { error: string } {
  if (json.length > MAX_DESIGN_CHARS)
    return { error: `design exceeds ${MAX_DESIGN_CHARS} characters` }
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { error: 'design is not valid JSON' }
  }
  const problem = validatePxd(parsed)
  if (problem) return { error: problem }
  const doc = parsed as PxdDoc
  return { doc: { ...doc, frameDelayMs: doc.frameDelayMs ?? 100 } }
}

function isInt(v: unknown): boolean {
  return typeof v === 'number' && Number.isInteger(v)
}

function isColor(v: unknown): boolean {
  return typeof v === 'string' && COLOR_RE.test(v)
}
