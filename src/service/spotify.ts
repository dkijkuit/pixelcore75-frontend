import api from './api.ts'

export type SpotifyStatus = { connected: boolean; displayName: string | null }

export async function fetchSpotifyStatus(): Promise<SpotifyStatus> {
  const { data } = await api.get<SpotifyStatus>('/spotify/status')
  return data
}

/** Resolves to the Spotify authorize URL; the caller navigates the browser there. */
export async function startSpotifyConnect(): Promise<string> {
  const { data } = await api.get<{ authorizeUrl: string }>('/spotify/oauth/start')
  return data.authorizeUrl
}
