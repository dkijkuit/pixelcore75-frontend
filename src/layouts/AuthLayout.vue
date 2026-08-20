<template>
  <div class="auth-layout d-flex align-center justify-center">
    <v-btn
      class="theme-toggle"
      size="small"
      variant="tonal"
      color="primary"
      :icon="theme.global.current.value.dark ? 'mdi-white-balance-sunny' : 'mdi-weather-night'"
      aria-label="Toggle dark mode"
      @click="toggleTheme"
    />

    <div class="auth-card-wrap w-100">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from 'vuetify'

const theme = useTheme()
const THEME_KEY = 'theme' as const

function toggleTheme() {
  const next = theme.global.current.value.dark ? 'light' : 'dark'
  theme.change(next)
  localStorage.setItem(THEME_KEY, next)
}
</script>

<style scoped>
.auth-layout {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  background:
    radial-gradient(1100px 520px at 12% -8%, rgba(var(--v-theme-primary), 0.16), transparent 60%),
    radial-gradient(900px 480px at 108% 108%, rgba(var(--v-theme-primary), 0.1), transparent 55%);
}

.theme-toggle {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
}

.auth-card-wrap {
  max-width: 440px;
  padding: 16px;
}
</style>
