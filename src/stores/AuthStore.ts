import { defineStore } from 'pinia'
import type { Px75User } from '@/types/users.ts'

export type Role = 'ADMIN' | 'USER' | 'MODERATOR' // adapt to yours

interface AuthState {
  accessToken: string | null // memory only (don’t persist)
  user: Px75User | null // can persist
  isInitializing: boolean
  loggedOutAt: number
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    accessToken: null,
    user: null as Px75User | null,
    isInitializing: true,
    loggedOutAt: 0,
  }),
  actions: {
    setSession(token: string, user: Px75User) {
      this.accessToken = token
      this.user = user
      // persist only the user (optional)
      sessionStorage.setItem('px75User', JSON.stringify(user))
    },
    clearSession() {
      this.accessToken = null
      this.user = null
      sessionStorage.removeItem('px75User')
      this.loggedOutAt = Date.now()
    },
    hydrateFromStorage() {
      // access token intentionally not persisted
      const raw = sessionStorage.getItem('px75User')
      this.user = raw ? (JSON.parse(raw) as Px75User) : null
    },
  },
})
