// router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import LoginView from '@/views/LoginView.vue'
import DashboardView from '@/views/DashboardView.vue'
import api from '@/service/api'
import DashboardUsers from '@/views/DashboardUsers.vue'
import DashboardHome from '@/views/DashboardHome.vue'
import DashboardPanels from '@/views/DashboardPanels.vue'
import PanelDetails from '@/components/panels/PanelDetails.vue'
import DashboardUserDetails from '@/components/users/DashboardUserDetails.vue'
import { useAuthStore } from '@/stores/AuthStore.ts'
// If you only have one instance, use: api.post("/auth/refresh", {}, { withCredentials: true })

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', component: LoginView },
  {
    path: '/dashboard',
    component: DashboardView,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard-home', component: DashboardHome },
      { path: 'users', name: 'dashboard-users', component: DashboardUsers },
      { path: 'users/:id', name: 'dashboard-user-details', component: DashboardUserDetails, props: true },
      { path: 'panels', name: 'dashboard-panels', component: DashboardPanels },
      { path: 'panels/:id', name: 'panel-details', component: PanelDetails, props: true },
    ],
  },
  {
    path: '/logout',
    component: LoginView,
    beforeEnter: async (_to, _from, next) => {
      const auth = useAuthStore()
      try {
        // tell backend to clear refresh cookie/session
        await api.post('/auth/logout', {}, { withCredentials: true })
      } catch {/* ignore */}

      // clear all client-side auth state
      auth.clearSession()
      localStorage.removeItem('accessToken')
      sessionStorage.removeItem('px75User')

      // hard-redirect to /login (avoid history back to logout)
      next({ path: '/login', replace: true })
    },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// router.beforeEach(async (to, _from, next) => {
//   const needsAuth = Boolean(to.meta.requiresAuth)
//   let token = localStorage.getItem('accessToken')
//
//   // If heading to /login and already authenticated, bounce to dashboard
//   if (to.path === '/login' && token) {
//     return next('/dashboard')
//   }
//
//   if (!needsAuth) return next()
//
//   // Need auth but no token -> try refresh via cookie
//   if (!token) {
//     try {
//       const res = await api.post<{ accessToken: string }>(
//         '/auth/refresh',
//         {},
//         { withCredentials: true },
//       )
//       token = res.data.accessToken
//       localStorage.setItem('accessToken', token)
//     } catch {
//       return next('/login')
//     }
//   }
//
//   return next()
// })

router.beforeEach(async (to, _from, next) => {
  const needsAuth = Boolean(to.meta.requiresAuth)
  const auth = useAuthStore()
  const token = auth.accessToken || localStorage.getItem('accessToken')

  if (to.path === '/login' && token) return next('/dashboard')
  if (!needsAuth) return next()

  if (!token) {
    try {
      const res = await api.post<{ accessToken: string; px75User: any }>(
        '/auth/refresh',
        {},
        { withCredentials: true },
      )
      auth.setSession(res.data.accessToken, res.data.px75User)
    } catch {
      return next('/login')
    }
  }

  return next()
})

export default router
