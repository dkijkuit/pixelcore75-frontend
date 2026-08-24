export type ImageFit = 'stretch' | 'fit' | 'cover'

export const IMAGE_FITS: { value: ImageFit; label: string; hint: string }[] = [
  { value: 'stretch', label: 'Stretch', hint: 'Fill 64x32, ignoring aspect ratio' },
  { value: 'fit', label: 'Fit', hint: 'Fit inside 64x32 with black bars' },
  { value: 'cover', label: 'Fill & crop', hint: 'Fill 64x32, center-cropped' },
]

const W = 64
const H = 32

export type DecodedImage = { source: CanvasImageSource; width: number; height: number }

/**
 * Decodes without color-space conversion where possible (same rationale as
 * PixelCanvas.loadImage: display color management adds ±1 RGB noise that breaks
 * the flood fill's color matching).
 */
export async function decodeImageFile(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { colorSpaceConversion: 'none' })
      return { source: bitmap, width: bitmap.width, height: bitmap.height }
    } catch {
      // fall back to <img> below (also when the browser lacks the option)
    }
  }
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('could not read file'))
    reader.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('image decode failed'))
    el.src = url
  })
  return { source: img, width: img.naturalWidth, height: img.naturalHeight }
}

/** Scales a decoded image to the 64x32 pxd bitmap (PNG data URL), RGB565-quantized. */
export function scaleToBitmapUrl(image: DecodedImage, fit: ImageFit, smooth: boolean): string {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('No 2D canvas context')
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, H)
  ctx.imageSmoothingEnabled = smooth
  ctx.imageSmoothingQuality = 'high'
  if (fit === 'stretch') {
    ctx.drawImage(image.source, 0, 0, W, H)
  } else {
    const scale =
      fit === 'fit'
        ? Math.min(W / image.width, H / image.height)
        : Math.max(W / image.width, H / image.height)
    const dw = image.width * scale
    const dh = image.height * scale
    ctx.drawImage(image.source, (W - dw) / 2, (H - dh) / 2, dw, dh)
  }
  quantizeCanvas(ctx)
  return canvas.toDataURL('image/png')
}

/**
 * Snaps every pixel to the panel's RGB565 gamut (same rounding as
 * quantizeToRgb565) so the canvas, palette tools, and the server-rendered
 * preview agree on colors; also flattens any remaining alpha onto black.
 */
function quantizeCanvas(ctx: CanvasRenderingContext2D) {
  const data = ctx.getImageData(0, 0, W, H)
  const px = data.data
  for (let i = 0; i < px.length; i += 4) {
    px[i] = Math.round((Math.floor((px[i] * 31 + 127) / 255) * 255) / 31)
    px[i + 1] = Math.round((Math.floor((px[i + 1] * 63 + 127) / 255) * 255) / 63)
    px[i + 2] = Math.round((Math.floor((px[i + 2] * 31 + 127) / 255) * 255) / 31)
    px[i + 3] = 255
  }
  ctx.putImageData(data, 0, 0)
}
