// router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import api from '@/service/api'
import type { Px75User } from '@/types/users.ts'
import { useAuthStore } from '@/stores/AuthStore.ts'

// Views are lazy-loaded so each route ships as its own chunk
const LoginView = () => import('@/views/LoginView.vue')
const DashboardView = () => import('@/views/DashboardView.vue')
const DashboardHome = () => import('@/views/DashboardHome.vue')
const DashboardUsers = () => import('@/views/DashboardUsers.vue')
const DashboardPanels = () => import('@/views/DashboardPanels.vue')
const DashboardCustomScreens = () => import('@/views/DashboardCustomScreens.vue')
const PanelDetails = () => import('@/components/panels/PanelDetails.vue')
const DashboardUserDetails = () => import('@/components/users/DashboardUserDetails.vue')
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
      {
        path: 'users/:id',
        name: 'dashboard-user-details',
        component: DashboardUserDetails,
        props: true,
      },
      {
        path: 'panels',
        name: 'dashboard-panels',
        component: DashboardPanels,
        meta: { fullWidth: true },
      },
      { path: 'panels/:id', name: 'panel-details', component: PanelDetails, props: true },
      {
        path: 'screens',
        name: 'dashboard-custom-screens',
        component: DashboardCustomScreens,
      },
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
      } catch {
        /* ignore */
      }

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
      const res = await api.post<{ accessToken: string; px75User: Px75User }>(
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
