<template>
  <v-container
    fluid
    class="d-flex align-center justify-center min-h-screen auth-background"
    :style="bgStyle"
  >
    <!-- Top-right theme toggle -->
    <div class="toggle-wrap">
      <v-btn
        size="small"
        variant="text"
        :icon="theme.global.current.value.dark ? 'mdi-white-balance-sunny' : 'mdi-weather-night'"
        aria-label="Toggle dark mode"
        @click="toggleTheme"
      />
    </div>

    <v-row justify="center" class="w-100">
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card color="surface" elevation="10" class="pa-8 rounded-xl">
          <slot />
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useTheme } from 'vuetify'

const theme = useTheme()
const THEME_KEY = 'theme' as const

function applyTheme(name: 'light' | 'dark') {
  theme.change(name)
}

function toggleTheme() {
  const next = theme.global.current.value.dark ? 'light' : 'dark'
  applyTheme(next)
  localStorage.setItem(THEME_KEY, next)
}

onMounted(() => {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'light' || saved === 'dark') {
    applyTheme(saved)
  } else {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    applyTheme(prefersDark ? 'dark' : 'light')
  }
})

/* ---------- Theme-aware background (no CSS vars) ---------- */
type RGB = { r: number; g: number; b: number }

function hexToRgb(hex: string): RGB {
  const m = hex.trim().replace('#', '')
  const s =
    m.length === 3
      ? m
          .split('')
          .map((c) => c + c)
          .join('')
      : m
  const n = parseInt(s, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
function rgbToCss({ r, g, b }: RGB) {
  return `rgb(${r}, ${g}, ${b})`
}
function mix(a: RGB, b: RGB, t: number): RGB {
  // t: 0..1, closer to b as t increases
  const clamp = (x: number) => Math.max(0, Math.min(255, Math.round(x)))
  return {
    r: clamp(a.r + (b.r - a.r) * t),
    g: clamp(a.g + (b.g - a.g) * t),
    b: clamp(a.b + (b.b - a.b) * t),
  }
}

const bgStyle = computed(() => {
  const cur = theme.global.current.value
  const colors = cur.colors
  const isDark = cur.dark

  // Vuetify returns hex strings (e.g., "#1E88E5")
  const primary = hexToRgb(colors.primary)
  const background = hexToRgb(colors.background)

  // Blend more of primary in dark to get a stronger accent
  const t = isDark ? 0.26 : 0.18
  const mixed = mix(primary, background, t)

  const start = rgbToCss(mixed)
  const end = rgbToCss(background)

  return {
    background: `linear-gradient(135deg, ${start}, ${end})`,
    minHeight: '100vh',
  } as const
})
</script>

<style scoped>
/* Top-right toggle positioning */
.toggle-wrap {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 10;
}
</style>
