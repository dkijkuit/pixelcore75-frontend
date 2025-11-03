import router from '@/router'
import api from '@/service/api'
import { useAuthStore } from '@/stores/AuthStore'
import type { Px75User } from '@/types/users.ts'

export async function login(username: string, password: string) {
  const { setSession } = useAuthStore()
  const res = await api.post<{
    accessToken: string
    refreshToken?: string // ideally not returned
    px75User: Px75User
  }>('/auth/login', { username, password })

  setSession(res.data.accessToken, res.data.px75User)
}

export async function logout() {
  const auth = useAuthStore()
  auth.clearSession()
  try {
    await api.post('/auth/logout', {}, { withCredentials: true })
  } catch {}
  await router.replace('/login')
}
