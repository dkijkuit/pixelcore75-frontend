<!-- src/views/DashboardHome.vue -->
<template>
  <div class="d-flex flex-column ga-6" style="min-height: 0">
    <!-- Greeting / Hero -->
    <div class="d-flex align-center flex-wrap ga-4">
      <div>
        <div class="text-h5 font-weight-medium">
          Welcome back{{ user?.username ? `, ${user.username}` : '' }}
        </div>
        <div class="text-body-2 text-medium-emphasis">
          Here's a quick overview of your panels and activity.
        </div>
      </div>

      <v-spacer />

      <!-- Quick actions -->
      <div class="d-flex flex-wrap ga-2">
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="$router.push({ name: 'dashboard-panels' })"
        >
          Create Panel
        </v-btn>
        <v-btn
          variant="tonal"
          prepend-icon="mdi-view-grid-outline"
          @click="$router.push({ name: 'dashboard-panels' })"
        >
          View Panels
        </v-btn>
        <v-btn
          variant="tonal"
          prepend-icon="mdi-account-multiple-outline"
          @click="$router.push({ name: 'dashboard-users' })"
        >
          Manage Users
        </v-btn>
      </div>
    </div>

    <!-- Stat cards -->
    <v-row dense>
      <v-col cols="12" md="4">
        <v-card height="100%">
          <v-card-text class="d-flex align-center justify-space-between">
            <div>
              <div class="text-body-2 text-medium-emphasis">Total Panels</div>
              <div class="text-h4 font-weight-medium">{{ loading ? '—' : panels.length }}</div>
            </div>
            <v-avatar size="44" color="primary" variant="tonal" rounded="lg">
              <v-icon>mdi-view-grid-outline</v-icon>
            </v-avatar>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card height="100%">
          <v-card-text class="d-flex align-center justify-space-between pb-2">
            <div>
              <div class="text-body-2 text-medium-emphasis">Configured</div>
              <div class="text-h4 font-weight-medium">
                {{ loading ? '—' : configuredCount }}
                <span class="text-body-2 text-medium-emphasis font-weight-regular">
                  / {{ loading ? '—' : panels.length }}
                </span>
              </div>
            </div>
            <v-avatar size="44" color="success" variant="tonal" rounded="lg">
              <v-icon>mdi-check-circle-outline</v-icon>
            </v-avatar>
          </v-card-text>
          <v-progress-linear
            :model-value="
              loading || panels.length === 0
                ? 0
                : Math.round((configuredCount / panels.length) * 100)
            "
            :height="4"
            rounded
            class="mb-4 mx-4"
          />
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card height="100%">
          <v-card-text class="d-flex align-center justify-space-between">
            <div>
              <div class="text-body-2 text-medium-emphasis">Your Panels</div>
              <div class="text-h4 font-weight-medium">{{ loading ? '—' : myPanelsCount }}</div>
            </div>
            <v-avatar size="44" color="secondary" variant="tonal" rounded="lg">
              <v-icon>mdi-account-circle-outline</v-icon>
            </v-avatar>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Content row: recent panels + tips -->
    <v-row class="flex-grow-1" style="min-height: 0">
      <v-col cols="12" lg="8" class="d-flex flex-column" style="min-height: 0">
        <v-card class="d-flex flex-column flex-grow-1" style="min-height: 0">
          <div class="d-flex align-center justify-space-between pa-4 pb-2">
            <span class="text-subtitle-1 font-weight-medium">Recent Panels</span>
            <v-btn
              variant="text"
              density="comfortable"
              prepend-icon="mdi-refresh"
              :loading="loading"
              @click="reload"
            >
              Refresh
            </v-btn>
          </div>

          <v-divider />

          <v-alert v-if="error" type="error" class="ma-4" closable @click:close="error = ''">
            {{ error }}
          </v-alert>

          <div class="pa-4 pt-2 d-flex flex-column flex-grow-1" style="min-height: 0">
            <!-- Virtual table for snappy scroll; shows last 10 by default -->
            <v-data-table-virtual
              v-if="!loading"
              :headers="headers"
              :items="recentPanels"
              item-key="panelId"
              fixed-header
              hover
              :height="computedTableHeight"
              class="flex-grow-1"
              @click:row="goToDetails"
              :item-props="() => ({ style: 'cursor: pointer' })"
              density="comfortable"
            >
              <template #[`item.panelType`]="{ item }">
                <v-chip size="small" color="primary" variant="tonal">
                  {{ item.panelType }}
                </v-chip>
              </template>
              <template #[`item.clientMac`]="{ item }">
                <div class="d-flex align-center ga-1">
                  <code>{{ item.clientMac }}</code>
                  <v-btn
                    icon="mdi-content-copy"
                    size="x-small"
                    variant="text"
                    @click.stop="copy(item.clientMac)"
                  />
                </div>
              </template>
              <template #[`item.configStatus`]="{ item }">
                <v-chip
                  :color="isConfigured(item) ? 'success' : 'default'"
                  size="small"
                  variant="tonal"
                >
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
                  <span
                    v-if="uniqueScreenTypes(item).length === 0"
                    class="text-medium-emphasis text-caption"
                    >—</span
                  >
                </div>
              </template>
            </v-data-table-virtual>
            <v-skeleton-loader v-else type="table" />
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" lg="4">
        <v-card height="100%">
          <div class="pa-4 pb-2 text-subtitle-1 font-weight-medium">Getting started</div>
          <v-divider />
          <v-list density="comfortable">
            <v-list-item
              title="Toggle dark / light mode"
              subtitle="Use the toggle in the top bar."
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/AuthStore.ts'
import { fetchPanels } from '@/service/api.ts'
import { getRowItem, type RowLike } from '@/utils/panels'
import type { DataTableHeader } from 'vuetify'

type ScreenType = 'IMAGE' | 'CRYPTO_TICKER' | 'WEATHER_FORECAST' | string
interface AnyScreen {
  screenType: ScreenType
  durationSeconds: number
  image?: string
  config?: { symbol?: string; currency?: string }
  latLon?: { lat: number; lon: number }
}
interface PanelConfig {
  panelId: number
  screensConfig: AnyScreen[]
}
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
    error.value = ''
  } catch {
    error.value = 'Failed to load panels'
  } finally {
    loading.value = false
    recalcTableHeight()
  }
}

onMounted(reload)

/* ---- Stats ---- */
const configuredCount = computed(
  () => panels.value.filter((p) => p.config?.screensConfig?.length).length,
)
const myPanelsCount = computed(
  () => panels.value.filter((p) => (user.value ? p.userId === user.value.id : false)).length,
)

/* ---- Recent panels (last 10 by panelId desc as a simple heuristic) ---- */
const recentPanels = computed(() =>
  [...panels.value].sort((a, b) => b.panelId - a.panelId).slice(0, 10),
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
  const list = p.config?.screensConfig?.map((s) => s.screenType) ?? []
  return Array.from(new Set(list))
}

function goToDetails(_e: MouseEvent, row: RowLike<Panel>) {
  const panel = getRowItem(row)
  router.push({ name: 'panel-details', params: { id: panel.panelId } })
}

function copy(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

/* ---- Responsive height for the virtual table ---- */
const tableHeight = ref(360)

function recalcTableHeight() {
  // compute a pleasant height for the virtual table inside the card
  const viewport = window.visualViewport?.height ?? window.innerHeight
  // Leave space for header/toolbars etc.
  const base = Math.max(260, Math.min(540, Math.round(viewport * 0.45)))
  tableHeight.value = base
}
function onResize() {
  recalcTableHeight()
}

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
