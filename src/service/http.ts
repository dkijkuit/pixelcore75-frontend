// import { useAuthStore } from '@/stores/AuthStore'
// import api from '@/service/api.ts'
// import type { InternalAxiosRequestConfig } from 'axios'
// import type { Px75User } from '@/types/users.ts'
//
// // Only attach token / do refresh for NON-auth endpoints
// api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
//   const url = (config.url || '').toString()
//
//   // Skip auth endpoints to avoid loops / interference
//   if (url.startsWith('/auth/')) return config
//
//   const auth = useAuthStore()
//
//   // (Optional) try refresh if no token
//   if (!auth.accessToken) {
//     try {
//       const res = await api.post<{ accessToken: string; px75User: Px75User }>('/auth/refresh', {})
//       auth.setSession(res.data.accessToken, res.data.px75User)
//     } catch {
//       // no valid refresh; continue unauthenticated
//     }
//   }
//
//   if (auth.accessToken) {
//     config.headers = config.headers ?? {}
//     ;(config.headers as any).Authorization = `Bearer ${auth.accessToken}`
//   }
//   return config
// })
