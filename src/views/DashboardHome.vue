<!-- src/views/DashboardHome.vue -->
<template>
  <v-container fluid class="pa-4 d-flex flex-column ga-4" style="min-height:0">
    <!-- Greeting / Hero -->
    <v-card variant="tonal" class="elevation-0 rounded-2xl">
      <v-card-text class="d-flex flex-column flex-md-row align-center justify-space-between ga-4">
        <div class="d-flex align-center ga-4">
          <v-avatar size="56" color="primary" class="elevation-1">
            <v-icon size="32">mdi-hand-wave</v-icon>
          </v-avatar>
          <div>
            <div class="text-h6 font-weight-medium">
              Welcome{{ user?.username ? `, ${user.username}` : '' }} 👋
            </div>
            <div class="text-body-2 text-medium-emphasis">
              Here’s a quick overview of your panels and activity.
            </div>
          </div>
        </div>

        <!-- Quick actions -->
        <div class="d-flex flex-wrap ga-2">
          <v-btn color="primary" prepend-icon="mdi-plus" @click="$router.push({ name: 'dashboard-panels' })">
            Create Panel
          </v-btn>
          <v-btn variant="tonal" prepend-icon="mdi-view-grid" @click="$router.push({ name: 'dashboard-panels' })">
            View Panels
          </v-btn>
          <v-btn variant="tonal" prepend-icon="mdi-account-multiple" @click="$router.push({ name: 'dashboard-users' })">
            Manage Users
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Stat cards -->
    <v-row>
      <v-col cols="12" md="4">
        <v-card class="rounded-2xl">
          <v-card-text class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis">Total Panels</div>
              <div class="text-h5">{{ loading ? '—' : panels.length }}</div>
            </div>
            <v-avatar size="42" color="primary" variant="tonal">
              <v-icon>mdi-view-grid</v-icon>
            </v-avatar>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="rounded-2xl">
          <v-card-text class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis">Configured</div>
              <div class="text-h5">
                {{ loading ? '—' : configuredCount }}
                <span class="text-body-2 text-medium-emphasis">/ {{ loading ? '—' : panels.length }}</span>
              </div>
            </div>
            <v-avatar size="42" color="success" variant="tonal">
              <v-icon>mdi-check-decagram</v-icon>
            </v-avatar>
          </v-card-text>
          <v-progress-linear
            :model-value="loading || panels.length === 0 ? 0 : Math.round((configuredCount / panels.length) * 100)"
            :height="6"
            rounded
            class="mx-4 mb-4"
          />
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="rounded-2xl">
          <v-card-text class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis">Your Panels</div>
              <div class="text-h5">
                {{ loading ? '—' : myPanelsCount }}
              </div>
            </div>
            <v-avatar size="42" color="secondary" variant="tonal">
              <v-icon>mdi-account-circle</v-icon>
            </v-avatar>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Content row: recent panels + tips -->
    <v-row class="flex-grow-1" style="min-height:0">
      <v-col cols="12" lg="8" class="d-flex flex-column" style="min-height:0">
        <v-card class="rounded-2xl d-flex flex-column flex-grow-1" style="min-height:0">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Recent Panels</span>
            <v-btn variant="text" density="comfortable" prepend-icon="mdi-refresh" @click="reload" :loading="loading">
              Refresh
            </v-btn>
          </v-card-title>

          <v-divider />

          <v-card-text class="pa-0 d-flex flex-column flex-grow-1" style="min-height:0">
            <v-skeleton-loader v-if="loading" type="table" class="pa-4" />
            <div v-else class="px-4 pb-4 pt-2 d-flex flex-column flex-grow-1" style="min-height:0">
              <!-- Virtual table for snappy scroll; shows last 10 by default -->
              <v-data-table-virtual
                :headers="headers"
                :items="recentPanels"
                item-key="panelId"
                fixed-header
                hover
                :height="computedTableHeight"
                class="flex-grow-1 rounded-b-2xl"
                @click:row="goToDetails"
                :item-props="() => ({ style: 'cursor: pointer' })"
                density="comfortable"
              >
                <template #[`item.panelType`]="{ item }">
                  <v-chip size="x-small" color="primary" variant="tonal">
                    {{ item.panelType }}
                  </v-chip>
                </template>
                <template #[`item.clientMac`]="{ item }">
                  <div class="d-flex align-center ga-1">
                    <code>{{ item.clientMac }}</code>
                    <v-btn icon="mdi-content-copy" size="x-small" variant="text" @click.stop="copy(item.clientMac)" />
                  </div>
                </template>
                <template #[`item.configStatus`]="{ item }">
                  <v-chip :color="isConfigured(item) ? 'success' : 'grey'" size="x-small" variant="flat">
                    {{ isConfigured(item) ? 'Configured' : 'Empty' }}
                  </v-chip>
                </template>
                <template #[`item.screenTypes`]="{ item }">
                  <div class="d-flex flex-wrap ga-1">
                    <v-chip
                      v-for="(t, i) in uniqueScreenTypes(item)"
                      :key="i"
                      size="x-small"
                      variant="tonal"
                    >
                      {{ t }}
                    </v-chip>
                    <span v-if="uniqueScreenTypes(item).length === 0" class="text-medium-emphasis text-caption">—</span>
                  </div>
                </template>
              </v-data-table-virtual>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="4">
        <v-card class="rounded-2xl">
          <v-card-title>Tips</v-card-title>
          <v-divider />
          <v-list density="comfortable">
            <v-list-item
              title="Toggle Dark / Light mode"
              subtitle="Use the drawer switch; backgrounds follow theme tokens."
              prepend-icon="mdi-theme-light-dark"
            />
            <v-list-item
              title="Add your first screen"
              subtitle="Open a panel &gt; Configuration &gt; Add Screen."
              prepend-icon="mdi-plus-circle-outline"
            />
            <v-list-item
              title="Copy IDs quickly"
              subtitle="Click the copy icon next to MAC or serial."
              prepend-icon="mdi-content-copy"
            />
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/AuthStore.ts'
import { fetchPanels } from '@/service/api.ts' // adjust if your path differs
import type { DataTableHeader } from 'vuetify'

type ScreenType = 'IMAGE' | 'CRYPTO_TICKER' | 'WEATHER_FORECAST' | string
interface AnyScreen {
  screenType: ScreenType
  durationSeconds: number
  image?: string
  config?: { symbol?: string; currency?: string }
  latLon?: { lat: number; lon: number }
}
interface PanelConfig { panelId: number; screensConfig: AnyScreen[] }
interface Panel {
  panelId: number
  userId: number
  username: string
  serial: string
  name: string
  clientMac: string
  panelType: string
  config: PanelConfig | null
}

const router = useRouter()
const auth = useAuthStore()
const user = computed(() => auth.user)

const loading = ref(true)
const panels = ref<Panel[]>([])
const error = ref('')

async function reload() {
  loading.value = true
  try {
    panels.value = await fetchPanels()
  } catch {
    error.value = 'Failed to load panels'
  } finally {
    loading.value = false
    await nextTick()
    recalcTableHeight()
  }
}

onMounted(reload)

/* ---- Stats ---- */
const configuredCount = computed(
  () => panels.value.filter(p => p.config?.screensConfig?.length).length
)
const myPanelsCount = computed(
  () => panels.value.filter(p => (user.value ? p.userId === user.value.id : false)).length
)

/* ---- Recent panels (last 10 by panelId desc as a simple heuristic) ---- */
const recentPanels = computed(() =>
  [...panels.value].sort((a, b) => b.panelId - a.panelId).slice(0, 10)
)

/* ---- Table ---- */
const headers: DataTableHeader[] = [
  { title: 'Panel ID', value: 'panelId', width: 90 },
  { title: 'Name', value: 'name' },
  { title: 'User', value: 'username', width: 110 },
  { title: 'Type', value: 'panelType', width: 120 },
  { title: 'Client MAC', value: 'clientMac', width: 190 },
  { title: 'Config', value: 'configStatus', width: 120, sortable: false },
  { title: 'Screen Types', value: 'screenTypes', sortable: false },
]

function isConfigured(p: Panel) {
  return !!(p.config && p.config.screensConfig && p.config.screensConfig.length > 0)
}

function uniqueScreenTypes(p: Panel): string[] {
  const list = p.config?.screensConfig?.map(s => s.screenType) ?? []
  return Array.from(new Set(list))
}

function goToDetails(_e: MouseEvent, row: any) {
  const panel = row?.item ?? row?.raw ?? row
  router.push({ name: 'panel-details', params: { id: panel.panelId } })
}

function copy(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

/* ---- Responsive height for the virtual table ---- */
const tableHeight = ref(360)
const slotEl = ref<HTMLElement | null>(null)

function recalcTableHeight() {
  // compute a pleasant height for the virtual table inside the card
  const viewport = window.visualViewport?.height ?? window.innerHeight
  // Leave space for header/toolbars etc.
  const base = Math.max(260, Math.min(540, Math.round(viewport * 0.45)))
  tableHeight.value = base
}
function onResize() { recalcTableHeight() }

onMounted(() => {
  recalcTableHeight()
  window.addEventListener('resize', onResize)
  window.visualViewport?.addEventListener?.('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  window.visualViewport?.removeEventListener?.('resize', onResize)
})

const computedTableHeight = computed(() => tableHeight.value)
</script>

<style scoped>
.rounded-2xl { border-radius: 16px; }
.ga-1 > * { margin-right: 4px; margin-bottom: 4px; }
.ga-2 > * { margin-right: 8px; margin-bottom: 8px; }
.ga-3 > * { margin-right: 12px; margin-bottom: 12px; }
</style>
