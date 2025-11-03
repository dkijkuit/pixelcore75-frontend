// api.ts
import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/AuthStore'
import type { Px75Panel } from '@/service/panels.ts'

const api = axios.create({
  baseURL: 'http://localhost:8080/v1',
  withCredentials: true,
})

// Helper: bare client to avoid interceptors recursion when needed
const bare = axios.create({
  baseURL: 'http://localhost:8080/v1',
  withCredentials: true,
})

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const url = (config.url || '').toString()

  // 1) Never add auth / trigger refresh for auth endpoints
  // Works for both '/auth/...' and full URLs ending with '/auth/...'
  if (url.startsWith('/auth/') || url.includes('/auth/')) {
    return config
  }

  const auth = useAuthStore()

  // 2) If no token, try a one-time refresh using the BARE client
  if (!auth.accessToken) {
    try {
      const res = await bare.post<{ accessToken: string; px75User: any }>(
        '/auth/refresh',
        {},
      )
      auth.setSession(res.data.accessToken, res.data.px75User)
    } catch {
      // proceed unauthenticated
    }
  }

  // 3) Attach bearer if we have it
  if (auth.accessToken) {
    config.headers = config.headers ?? {}
    ;(config.headers as any).Authorization = `Bearer ${auth.accessToken}`
  }

  return config
})

export async function fetchPanels(): Promise<Px75Panel[]> {
  const { data } = await api.get<Px75Panel[]>('/panel')
  return data
}

export default api
