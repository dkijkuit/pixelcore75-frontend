import { isAxiosError } from 'axios'
import api from './api.ts'

export type CustomPreview = { frames: string[]; frameDelayMs: number }

export async function previewCustomDesign(design: string): Promise<CustomPreview> {
  try {
    const { data } = await api.post<CustomPreview>('/screen/custom/preview', { design })
    return data
  } catch (err) {
    if (isAxiosError(err)) {
      const message = (err.response?.data as { message?: string } | undefined)?.message
      if (message) throw new Error(message)
    }
    throw err instanceof Error ? err : new Error(String(err))
  }
}
