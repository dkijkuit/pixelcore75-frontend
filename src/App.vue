<template>
  <v-app>
    <router-view />
  </v-app>
</template>

<script lang="ts">
import { useTheme } from 'vuetify'
import { defineComponent } from 'vue'

window.addEventListener('storage', (e) => {
  if (e.key === 'theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
    const t = useTheme()
    t.global.name.value = e.newValue
  }
})

export default defineComponent({
  name: 'App',
})
</script>
