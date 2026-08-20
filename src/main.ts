import '@mdi/font/css/materialdesignicons.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'vuetify/styles'
import './assets/main.css'
import { createVuetify } from 'vuetify'
import { useAuthStore } from './stores/AuthStore'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import App from './App.vue'
import router from './router'
import 'leaflet/dist/leaflet.css'

// Optional: fix default marker icon paths when bundling
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

// --- NEW: pick initial theme from localStorage or system ---
const saved = localStorage.getItem('theme')
const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
const defaultTheme: 'light' | 'dark' =
  saved === 'dark' || saved === 'light' ? saved : prefersDark ? 'dark' : 'light'

// (Optional) prevent a light->dark flash before Vuetify mounts
const initialClass = `v-theme--${defaultTheme}`
document.documentElement.classList.add(initialClass)

// --- Vuetify with defaultTheme from above ---
const vuetify = createVuetify({
  components,
  directives,
  defaults: {
    VAlert: { variant: 'tonal' },
    VBtn: { rounded: 'lg' },
    VCard: { rounded: 'lg', border: true, elevation: 0 },
    VCombobox: { variant: 'outlined', density: 'comfortable' },
    VDialog: { scrim: 'rgba(9, 12, 20, 0.5)' },
    VSelect: { variant: 'outlined', density: 'comfortable' },
    VTextarea: { variant: 'outlined', density: 'comfortable' },
    VTextField: { variant: 'outlined', density: 'comfortable' },
  },
  icons: { defaultSet: 'mdi' },
  theme: {
    defaultTheme, // <-- was 'light'
    themes: {
      light: {
        dark: false,
        colors: {
          background: '#F6F8FB',
          surface: '#FFFFFF',
          'surface-variant': '#EDF1F7',
          primary: '#2563EB',
          'on-primary': '#FFFFFF',
          secondary: '#475569',
          info: '#0284C7',
          success: '#16A34A',
          warning: '#D97706',
          error: '#DC2626',
        },
      },
      dark: {
        dark: true,
        colors: {
          background: '#0E1320',
          surface: '#1A2130',
          'surface-variant': '#263044',
          primary: '#8AB4F8',
          'on-primary': '#10265C',
          secondary: '#94A3B8',
          info: '#60A5FA',
          success: '#4ADE80',
          warning: '#FBBF24',
          error: '#F87171',
        },
      },
    },
  },
})

L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
})

const app = createApp(App)
app.use(vuetify)
app.use(createPinia())
app.use(router)

const auth = useAuthStore()
auth.hydrateFromStorage()

// No refresh here. The router guard will refresh ONLY on protected routes.
await router.isReady()
auth.isInitializing = false

app.mount('#app')

// --- remove bootstrap class once Vuetify is in control ---
document.documentElement.classList.remove(initialClass)
