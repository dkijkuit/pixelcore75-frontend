import cgPixel from '@/assets/fonts/cg-pixel-4x5.ttf'
import exrPixelPerfect from '@/assets/fonts/EXEPixelPerfect.ttf'
import frostFont from '@/assets/fonts/frostfont-logo.ttf'
import grinchedFont from '@/assets/fonts/grinched-4x7.ttf'
import habboFont from '@/assets/fonts/Habbo.ttf'
import miniLine from '@/assets/fonts/MiniLine2.ttf'
import tinyUnicode from '@/assets/fonts/TinyUnicode.ttf'
import { FONT_IDS, PXD_FONTS, type PxdFontId } from '@/types/pxd.ts'

/**
 * Loads the pxd pixel fonts (same TTFs as the server's assets/fonts) so the editor
 * canvas draws text layers with the real display font instead of a generic monospace
 * approximation. Bundled through Vite — hashed, base-relative URLs that survive any
 * deployment path. Idempotent: concurrent/late callers share one registration.
 */
const FONT_FILES: Record<PxdFontId, string> = {
  CG_PIXEL: cgPixel,
  MINI_LINE: miniLine,
  HABBO: habboFont,
  LED_BOARD: exrPixelPerfect,
  TINY: tinyUnicode,
  FROST: frostFont,
  GRINCHED: grinchedFont,
}

const family = (id: PxdFontId) => `"PXD ${id}"`

let fontsReady: Promise<void> | null = null

export function loadPxdFonts(): Promise<void> {
  if (!fontsReady) {
    fontsReady = Promise.all(
      FONT_IDS.map(async (id) => {
        const url = FONT_FILES[id]
        try {
          const face = new FontFace(family(id), `url(${url})`)
          document.fonts.add(await face.load())
        } catch (error) {
          // A failed load must not pass silently — the canvas would fall back to a
          // hugely wrong monospace and look like a font-scale bug.
          console.warn(`Failed to load pxd font ${id} from ${url}`, error)
        }
      }),
    ).then(() => undefined)
  }
  return fontsReady
}

export function pxdFontSpec(id: PxdFontId): string {
  return `${PXD_FONTS[id].size}px ${family(id)}, monospace`
}
