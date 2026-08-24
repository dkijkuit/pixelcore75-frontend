import { isAxiosError } from 'axios'
import api from './api.ts'

/** A custom screen library entry (list form — design/usageCount only on detail). */
export type CustomScreen = {
  id: number
  name: string
  durationSeconds: number
  shared: boolean
  owned: boolean
  ownerId: number
  ownerUsername: string
  thumbnail: string | null
  updatedAt: string
  design?: string
  usageCount?: number
}

/** Create/update body — the design's own `name` field is the screen's name. */
export type SaveCustomScreenPayload = {
  design: string
  durationSeconds: number
  shared: boolean
}

function unwrap(err: unknown): Error {
  if (isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)?.message
    if (message) return new Error(message)
  }
  return err instanceof Error ? err : new Error(String(err))
}

async function call<T>(p: Promise<{ data: T }>): Promise<T> {
  try {
    return (await p).data
  } catch (err) {
    throw unwrap(err)
  }
}

/** Everything the user may see: their own screens plus others' shared ones (admin: all). */
export function listCustomScreens(): Promise<CustomScreen[]> {
  return call(api.get<CustomScreen[]>('/screen/custom'))
}

/** Full detail including the design and how many panel rotations reference it. */
export function fetchCustomScreen(id: number): Promise<CustomScreen> {
  return call(api.get<CustomScreen>(`/screen/custom/${id}`))
}

export function createCustomScreen(payload: SaveCustomScreenPayload): Promise<CustomScreen> {
  return call(api.post<CustomScreen>('/screen/custom', payload))
}

export function updateCustomScreen(
  id: number,
  payload: SaveCustomScreenPayload,
): Promise<CustomScreen> {
  return call(api.put<CustomScreen>(`/screen/custom/${id}`, payload))
}

export async function deleteCustomScreen(id: number): Promise<void> {
  try {
    await api.delete(`/screen/custom/${id}`)
  } catch (err) {
    throw unwrap(err)
  }
}
