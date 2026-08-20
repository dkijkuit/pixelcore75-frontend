// api.ts
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/AuthStore'
import type { Px75User } from '@/types/users.ts'
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

/** In-flight refresh, shared so concurrent 401s trigger only one /auth/refresh. */
let refreshInFlight: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = bare
      .post<{ accessToken: string; px75User: Px75User }>('/auth/refresh', {})
      .then((res) => {
        const auth = useAuthStore()
        auth.setSession(res.data.accessToken, res.data.px75User)
        return res.data.accessToken
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

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
    await refreshAccessToken()
  }

  // 3) Attach bearer if we have it
  if (auth.accessToken) {
    config.headers.set('Authorization', `Bearer ${auth.accessToken}`)
  }

  return config
})

// Recover from an EXPIRED (but present) access token: the request interceptor only
// refreshes when the token is missing, so a page left open past the token TTL would
// otherwise fail every mutation with 401. Refresh once via the refresh cookie, retry
// the original request; if refreshing fails the session is gone -> back to /login.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retriedAfterRefresh?: boolean }) | undefined
    const url = (config?.url || '').toString()
    const isAuthCall = url.startsWith('/auth/') || url.includes('/auth/')

    if (error.response?.status === 401 && config && !isAuthCall && !config._retriedAfterRefresh) {
      const token = await refreshAccessToken()
      if (token) {
        config._retriedAfterRefresh = true
        config.headers.set('Authorization', `Bearer ${token}`)
        return api.request(config)
      }
      // Refresh refused: session is dead. Clear state (incl. legacy localStorage token
      // that the router guard still reads — it would bounce /login back to /dashboard)
      // and hard-redirect to login.
      useAuthStore().clearSession()
      localStorage.removeItem('accessToken')
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  },
)

export async function fetchPanels(): Promise<Px75Panel[]> {
  const { data } = await api.get<Px75Panel[]>('/panel')
  return data
}

export default api
