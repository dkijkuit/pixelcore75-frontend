import '@mdi/font/css/materialdesignicons.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'vuetify/styles'
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
    VCard: { color: 'surface' },
    VDialog: { scrim: 'rgba(0,0,0,0.6)' }, // optional
  },
  icons: { defaultSet: 'mdi' },
  theme: {
    defaultTheme, // <-- was 'light'
    themes: {
      light: {
        dark: false,
        colors: {
          background: '#FFFFFF',
          surface: '#FFFFFF',
          primary: '#1976D2',
          secondary: '#03DAC6',
        },
      },
      dark: {
        dark: true,
        colors: {
          background: '#121212',
          surface: '#121212',
          primary: '#90CAF9',
          secondary: '#03DAC6',
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
