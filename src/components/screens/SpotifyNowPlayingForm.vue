<script setup lang="ts">
import { isAxiosError } from 'axios'
import { onMounted, ref } from 'vue'
import type { AnyScreen } from '@/registry/screensRegistry.ts'
import { fetchSpotifyStatus, startSpotifyConnect } from '@/service/spotify.ts'

// Narrow to our Spotify screen
type T = Extract<AnyScreen, { screenType: 'SPOTIFY_NOW_PLAYING' }>

const props = defineProps<{ modelValue: T }>()
const emit = defineEmits<{ 'update:modelValue': [T] }>()

function update(patch: Partial<T>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

const connected = ref<boolean | null>(null)
const displayName = ref('')
const connecting = ref(false)
const statusError = ref('')

onMounted(async () => {
  try {
    const status = await fetchSpotifyStatus()
    connected.value = status.connected
    displayName.value = status.displayName ?? ''
  } catch {
    connected.value = null
    statusError.value = 'Could not reach the server for the Spotify connection status.'
  }
})

async function connect() {
  connecting.value = true
  statusError.value = ''
  try {
    window.location.href = await startSpotifyConnect()
  } catch (err) {
    connecting.value = false
    const message = isAxiosError(err)
      ? (err.response?.data as { message?: string } | undefined)?.message
      : undefined
    statusError.value = message ?? 'Could not start the Spotify connect flow.'
  }
}
</script>

<template>
  <div class="d-flex flex-column ga-3">
    <v-alert
      v-if="connected === true"
      type="success"
      variant="tonal"
      density="compact"
      :text="`Connected${displayName ? ` as ${displayName}` : ''} — the panel shows whatever this account plays.`"
    />
    <v-alert
      v-else-if="connected === false"
      type="warning"
      variant="tonal"
      density="compact"
      text="Not connected — authorize once, then every panel can show this screen."
    />
    <v-alert v-else-if="statusError" type="error" variant="tonal" density="compact" :text="statusError" />

    <v-btn
      color="green-darken-2"
      variant="tonal"
      :loading="connecting"
      :disabled="connected === true"
      prepend-icon="mdi-spotify"
      @click="connect"
    >
      {{ connected === true ? 'Spotify connected' : 'Connect Spotify' }}
    </v-btn>

    <v-slider
      label="Frame delay (ms)"
      :model-value="modelValue.frameDelayMs"
      @update:model-value="(v) => update({ frameDelayMs: Number(v) || 250 })"
      :min="100"
      :max="1000"
      :step="50"
      thumb-label
    />

    <v-switch
      inset
      :model-value="modelValue.showIdleScreen"
      @update:model-value="(v) => update({ showIdleScreen: !!v })"
      :label="modelValue.showIdleScreen ? 'Show idle screen when nothing plays' : 'Blank when nothing plays'"
    />

    <v-switch
      inset
      :model-value="modelValue.showAlbumArt"
      @update:model-value="(v) => update({ showAlbumArt: !!v })"
      :label="modelValue.showAlbumArt ? 'Show album art' : 'Text only (no album art)'"
    />
  </div>
</template>
