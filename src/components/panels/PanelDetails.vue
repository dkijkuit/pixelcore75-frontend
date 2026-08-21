<template>
  <div class="d-flex flex-column ga-6">
    <!-- Header -->
    <div class="d-flex align-center flex-wrap ga-3">
      <v-btn icon="mdi-arrow-left" variant="text" density="comfortable" @click="router.back()" />
      <v-skeleton-loader v-if="loading" type="text" width="160" />
      <template v-else>
        <span class="text-h5 font-weight-medium">{{ panel?.name }}</span>
        <v-chip size="small" color="primary" variant="tonal" label>
          {{ panel?.panelType }}
        </v-chip>
      </template>
      <v-spacer />
      <v-btn variant="tonal" prepend-icon="mdi-pencil" @click="openDetailsDialog">
        Edit panel
      </v-btn>
    </div>

    <v-alert v-if="error" type="error">{{ error }}</v-alert>

    <v-skeleton-loader v-if="loading" type="article" />

    <template v-else>
      <v-row>
        <!-- Overview -->
        <v-col cols="12" lg="7">
          <v-card height="100%">
            <v-card-text>
              <div class="text-subtitle-1 font-weight-medium mb-4">Overview</div>
              <v-row dense>
                <v-col cols="6" sm="3">
                  <div class="text-caption text-medium-emphasis">Panel ID</div>
                  <div class="text-body-1">{{ panel?.panelId }}</div>
                </v-col>
                <v-col cols="6" sm="3">
                  <div class="text-caption text-medium-emphasis">Panel Type</div>
                  <div class="text-body-1">{{ panel?.panelType }}</div>
                </v-col>
                <v-col cols="6" sm="3">
                  <div class="text-caption text-medium-emphasis">Owner</div>
                  <div class="text-body-1">
                    {{ panel?.username }}
                    <span class="text-medium-emphasis text-caption">(ID {{ panel?.userId }})</span>
                  </div>
                </v-col>
                <v-col cols="6" sm="3">
                  <div class="text-caption text-medium-emphasis">Screens</div>
                  <div class="text-body-1">{{ screenCount }}</div>
                </v-col>
                <v-col cols="12" sm="6">
                  <div class="text-caption text-medium-emphasis">Serial</div>
                  <div class="d-flex align-center ga-1">
                    <code>{{ panel?.serial }}</code>
                    <v-tooltip text="Copy serial to clipboard">
                      <template #activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-content-copy"
                          size="x-small"
                          variant="text"
                          @click="copy(panel?.serial || '')"
                        />
                      </template>
                    </v-tooltip>
                  </div>
                </v-col>
                <v-col cols="12" sm="6">
                  <div class="text-caption text-medium-emphasis">Client MAC</div>
                  <div class="d-flex align-center ga-1">
                    <code>{{ panel?.clientMac }}</code>
                    <v-tooltip text="Copy MAC address to clipboard">
                      <template #activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-content-copy"
                          size="x-small"
                          variant="text"
                          @click="copy(panel?.clientMac || '')"
                        />
                      </template>
                    </v-tooltip>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Live Preview -->
        <v-col cols="12" lg="5">
          <v-card height="100%">
            <v-card-text>
              <div class="d-flex align-center justify-space-between mb-4">
                <div class="text-subtitle-1 font-weight-medium">Live Preview</div>
                <v-chip v-if="liveStatus" :color="liveStatus.color" size="small" variant="tonal">
                  <v-icon start size="x-small">mdi-circle</v-icon>
                  {{ liveStatus.label }}
                </v-chip>
              </div>
              <div class="preview-shell">
                <v-skeleton-loader v-if="firstFramePending && isConfigured" type="image" width="320" />
                <img v-else-if="imgSrc" :src="imgSrc" alt="panel frame" class="preview-frame" />
                <div v-else class="text-body-2 text-medium-emphasis">
                  {{ isConfigured ? 'Waiting for a frame…' : 'No screens configured' }}
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Configuration -->
      <v-card>
        <div class="d-flex align-center justify-space-between flex-wrap ga-3 pa-4">
          <div class="text-subtitle-1 font-weight-medium">Configuration</div>
          <v-btn color="primary" prepend-icon="mdi-plus" size="small" @click="openAdd()"
            >Add Screen</v-btn
          >
        </div>

        <v-divider />

        <v-card-text>
          <v-row dense class="mb-2">
            <v-col cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Status</div>
              <div>
                <v-chip v-if="isConfigured" color="success" size="small" variant="tonal"
                  >Configured</v-chip
                >
                <v-chip v-else size="small" variant="tonal">Empty</v-chip>
              </div>
            </v-col>
            <v-col cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Screens</div>
              <div class="text-body-1">{{ screenCount }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-caption text-medium-emphasis">Types</div>
              <div class="d-flex flex-wrap ga-1">
                <v-chip
                  v-for="(t, i) in uniqueScreenTypes"
                  :key="i"
                  size="x-small"
                  variant="tonal"
                  >{{ t }}</v-chip
                >
                <span v-if="uniqueScreenTypes.length === 0" class="text-medium-emphasis">—</span>
              </div>
            </v-col>
          </v-row>

          <!-- Screens table (draggable) -->
          <v-table v-if="screenCount > 0" density="comfortable" hover>
            <thead>
              <tr>
                <th class="text-left" style="width: 40px"></th>
                <!-- drag handle -->
                <th class="text-left" style="width: 56px">#</th>
                <th class="text-left">Type</th>
                <th class="text-left">Details</th>
                <th class="text-left" style="width: 120px">Duration (s)</th>
                <th class="text-left" style="width: 120px">Actions</th>
              </tr>
            </thead>

            <!-- Use draggable as tbody -->
            <draggable
              v-model="screensLocal"
              item-key="__key"
              tag="tbody"
              handle=".drag-handle"
              @end="persistOrder"
            >
              <template #item="{ element: s, index: i }">
                <tr>
                  <td class="drag-handle" title="Drag to reorder">
                    <v-icon size="small">mdi-drag</v-icon>
                  </td>
                  <td>{{ i + 1 }}</td>
                  <td>
                    <v-chip size="small" color="primary" variant="tonal">
                      {{ s.screenType }}
                    </v-chip>
                  </td>
                  <td class="text-body-2">{{ formatScreenDetails(s) }}</td>
                  <td>{{ s.durationSeconds }}</td>
                  <td>
                    <v-btn
                      size="small"
                      variant="text"
                      icon="mdi-pencil"
                      :aria-label="`Edit screen ${i + 1}`"
                      @click="openEdit(i)"
                    />
                    <v-btn
                      size="small"
                      variant="text"
                      icon="mdi-delete"
                      color="error"
                      :aria-label="`Delete screen ${i + 1}`"
                      @click="openDelete(i)"
                    />
                  </td>
                </tr>
              </template>
            </draggable>
          </v-table>

          <!-- Raw JSON viewer -->
          <v-expansion-panels class="mt-2" variant="inset">
            <v-expansion-panel>
              <v-expansion-panel-title>Raw config JSON</v-expansion-panel-title>
              <v-expansion-panel-text>
                <pre class="raw-json">{{ prettyConfig }}</pre>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>
      </v-card>
    </template>

    <!-- Edit Panel Details Dialog -->
    <v-dialog v-model="detailsDialog.open" max-width="520">
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-medium pt-4 px-6"
          >Edit panel details</v-card-title
        >
        <v-card-text>
          <v-form ref="detailsFormRef" v-model="detailsDialog.valid" @submit.prevent="saveDetails">
            <!-- Panel Type: allow select OR custom via combobox -->
            <v-combobox
              label="Panel Type"
              v-model="detailsDialog.form.panelType"
              :items="panelTypes"
              clearable
              hide-selected
              :rules="[rules.required]"
            />

            <v-text-field
              label="Name"
              v-model.trim="detailsDialog.form.name"
              :counter="64"
              :rules="[rules.required, rules.maxLen(64)]"
            />

            <v-text-field
              label="Client MAC"
              v-model.trim="detailsDialog.form.clientMac"
              placeholder="AA:BB:CC:DD:EE:FF"
              :rules="[rules.required, rules.mac]"
            />

            <v-text-field
              label="Serial"
              v-model.trim="detailsDialog.form.serial"
              :rules="[rules.required, rules.maxLen(128)]"
            />
          </v-form>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="closeDetailsDialog">Cancel</v-btn>
          <v-btn color="primary" :loading="detailsDialog.saving" @click="saveDetails">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Screen Dialog (wider for the map-based aircraft form) -->
    <v-dialog
      v-model="dialog.open"
      :max-width="dialog.form.screenType === 'NEARBY_AIRCRAFT' ? 780 : 520"
    >
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-medium pt-4 px-6">
          {{ dialog.mode === 'add' ? 'Add Screen' : 'Edit Screen' }}
        </v-card-title>

        <v-card-text>
          <v-form ref="formRef" class="d-flex flex-column ga-3" @submit.prevent="saveDialog">
            <div class="d-flex ga-3">
              <v-select
                label="Screen Type"
                class="flex-grow-1"
                :items="screenTypeOptions"
                item-title="title"
                item-value="value"
                v-model="dialog.form.screenType"
                required
              />
              <v-text-field
                type="number"
                label="Duration (seconds)"
                v-model.number="dialog.form.durationSeconds"
                :min="1"
                class="flex-grow-0"
                style="width: 170px"
                required
              />
            </div>

            <!-- Per-type form is now a single dynamic component -->
            <component
              :is="CurrentForm"
              :model-value="dialog.form"
              @update:model-value="mergeFormPatch"
            />
          </v-form>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
          <v-btn color="primary" @click="saveDialog">
            {{ dialog.mode === 'add' ? 'Add' : 'Save' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Screen Confirm Dialog -->
    <v-dialog v-model="deleteDialog.open" max-width="420">
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-medium pt-4 px-6"
          >Delete screen</v-card-title
        >
        <v-card-text>
          Are you sure you want to delete
          <strong>screen {{ (deleteDialog.index ?? 0) + 1 }}</strong
          >? This action can’t be undone.
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="closeDelete">Cancel</v-btn>
          <v-btn color="error" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  h,
  nextTick,
  onMounted,
  ref,
  watch,
  onBeforeUnmount,
  defineAsyncComponent,
  type Component,
} from 'vue'
import { useRoute } from 'vue-router'
import { VSkeletonLoader } from 'vuetify/components'
import {
  updatePanelDetails,
  fetchPanelById,
  type PanelConfig,
  savePanelConfig,
} from '@/service/panels.ts'
import Draggable from 'vuedraggable'
import { useAuthStore } from '@/stores/AuthStore.ts'
import router from '@/router'
import { panelTypes } from '@/utils/panels.ts'
import {
  type AnyScreen,
  getDef,
  type KnownScreen,
  type ScreenType,
  screenTypes as allScreenTypes,
} from '@/registry/screensRegistry.ts'

interface PanelDetails {
  panelId: number
  userId: number
  username: string
  serial: string
  name: string
  clientMac: string
  panelType: string
  config: PanelConfig | null
}

const props = defineProps<{
  id: string | number
}>()

const panelId = computed(() => Number(props.id))
const route = useRoute()

const panel = ref<PanelDetails | null>(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    panel.value = (await fetchPanelById(panelId.value)) as unknown as PanelDetails
  } catch (e) {
    error.value = 'Failed to load panel: ' + e
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(
  () => route.params.id,
  () => load(),
)

function getAccessToken(): string | null {
  return useAuthStore().accessToken
}

type TicketResponse = { ticket: string; expiresIn: number }

async function fetchSseTicket(panelId: number): Promise<TicketResponse> {
  const token = getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const res = await fetch(`http://localhost:8080/v1/panel/image/${panelId}/ticket`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    throw new Error(`Ticket request failed: ${res.status} ${msg}`)
  }
  return (await res.json()) as TicketResponse
}

const imgSrc = ref<string | undefined>(undefined)
const firstFramePending = ref(true)

/* ---------- SSE connection with hardening (ticket-based) ---------- */
const BASE_BACKOFF_MS = 1000
const MAX_BACKOFF_MS = 30_000
const BACKOFF_FACTOR = 1.8

let es: EventSource | null = null
let reconnectTimer: number | null = null
let recycleTimer: number | null = null
let backoff = BASE_BACKOFF_MS
let lastPanelId: number | null = null

function closeSse() {
  if (recycleTimer != null) {
    clearTimeout(recycleTimer)
    recycleTimer = null
  }
  if (reconnectTimer != null) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (es) {
    try {
      es.close()
    } catch {}
    es = null
  }
}

function scheduleRecycle(panelId: number, expiresInSeconds: number) {
  // reconnect a bit *before* ticket expiry to avoid a 401 race
  const leadMs = 5_000 // 5s safety margin
  const ms = Math.max(1_000, expiresInSeconds * 1000 - leadMs)
  if (recycleTimer != null) clearTimeout(recycleTimer)
  recycleTimer = window.setTimeout(() => {
    connectSse(panelId) // fetch a fresh ticket & reopen
  }, ms) as unknown as number
}

const liveStatus = computed(() => {
  if (!isConfigured.value) return { label: 'No screens', color: 'grey' }
  if (firstFramePending.value) return { label: 'Connecting…', color: 'grey' }
  if (es) return { label: 'Live', color: 'success' }
  return { label: 'Offline', color: 'error' }
})

/** Open an SSE connection for a given panelId using a one-time ticket. */
async function connectSse(panelId: number) {
  lastPanelId = panelId
  closeSse()
  firstFramePending.value = true
  imgSrc.value = undefined

  try {
    // 1) Authenticated POST to get short-lived ticket
    const { ticket, expiresIn } = await fetchSseTicket(panelId)

    // 2) Native EventSource without custom headers
    const url = `http://localhost:8080/v1/panel/image/${panelId}?ticket=${encodeURIComponent(ticket)}`
    es = new EventSource(url)

    es.onopen = () => {
      backoff = BASE_BACKOFF_MS
      scheduleRecycle(panelId, expiresIn)
    }

    es.addEventListener('frame', (ev: MessageEvent) => {
      const b64 = ev.data as string
      imgSrc.value = `data:image/png;base64,${b64}`
      firstFramePending.value = false
    })

    // If the browser stops retrying, apply our own backoff and reopen (new ticket)
    es.onerror = () => {
      if (!es) return
      if (es.readyState === EventSource.CLOSED) {
        closeSse()
        const delay = Math.min(backoff, MAX_BACKOFF_MS)
        reconnectTimer = window.setTimeout(() => {
          connectSse(panelId) // fetch a fresh ticket on each attempt
        }, delay) as unknown as number
        backoff = Math.min(Math.floor(backoff * BACKOFF_FACTOR), MAX_BACKOFF_MS)
      }
      // If CONNECTING, let native retry keep going until it closes.
    }
  } catch (e) {
    // Ticket failed (e.g., 401/403). Backoff and try again.
    console.error(e)
    const delay = Math.min(backoff, MAX_BACKOFF_MS)
    reconnectTimer = window.setTimeout(() => {
      connectSse(panelId)
    }, delay) as unknown as number
    backoff = Math.min(Math.floor(backoff * BACKOFF_FACTOR), MAX_BACKOFF_MS)
  }
}

watch(panel, (p) => {
  if (p?.panelId != null) connectSse(p.panelId)
})

onMounted(() => {
  if (panel.value?.panelId != null) connectSse(panel.value.panelId)

  // Resume immediately when network comes back
  const onOnline = () => {
    if (!es && lastPanelId != null) connectSse(lastPanelId)
  }
  const onOffline = () => {
    // Stop spinning while offline
    closeSse()
  }
  const onVisibility = () => {
    if (document.visibilityState === 'visible' && !es && lastPanelId != null) {
      connectSse(lastPanelId)
    }
    // Optionally close on hidden to reduce server load.
  }

  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  document.addEventListener('visibilitychange', onVisibility)

  onBeforeUnmount(() => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    document.removeEventListener('visibilitychange', onVisibility)
  })
})

onBeforeUnmount(() => {
  closeSse()
})

/* ---------- Derived + local, draggable state ---------- */
const screens = computed<KnownScreen[]>(() => panel.value?.config?.screensConfig ?? [])

/** A local, mutable copy for drag/drop (augmented with a stable __key) */
const screensLocal = ref<(AnyScreen & { __key: string })[]>([])

function withKeys(arr: AnyScreen[]): (AnyScreen & { __key: string })[] {
  return arr.map((s, idx) => ({ ...s, __key: `${idx}-${cryptoRandom()}` }))
}
function stripKeys(arr: (AnyScreen & { __key: string })[]): AnyScreen[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return arr.map(({ __key: _, ...rest }) => rest)
}
function cryptoRandom() {
  return Math.random().toString(36).slice(2, 9)
}

/** keep local list synced with server data */
watch(
  screens,
  (val) => {
    screensLocal.value = withKeys(val ?? [])
  },
  { immediate: true },
)

const screenCount = computed(() => screensLocal.value.length)
const uniqueScreenTypes = computed(() => {
  const set = new Set<string>()
  for (const s of screensLocal.value) set.add(s.screenType)
  return Array.from(set)
})
const isConfigured = computed(() => screenCount.value > 0)

watch(screenCount, (count) => {
  if (count === 0) {
    imgSrc.value = undefined
    firstFramePending.value = false
  } else if (!imgSrc.value) {
    firstFramePending.value = true
  }
})
const prettyConfig = computed(() =>
  panel.value?.config ? JSON.stringify(panel.value.config, null, 2) : 'null',
)

function formatScreenDetails(s: AnyScreen): string {
  return getDef(s.screenType as ScreenType).format(s as never)
}

/* ---------- Add/Edit dialog state ---------- */
const screenTypeOptions = computed(() =>
  allScreenTypes.map((t) => ({ title: getDef(t).label, value: t })),
)
const suppressTypeReset = ref(false)
const formRef = ref()
const dialog = ref<{
  open: boolean
  mode: 'add' | 'edit'
  index: number | null
  form: AnyScreen
}>({
  open: false,
  mode: 'add',
  index: null,
  form: defaultScreen('IMAGE'),
})

function defaultScreen(type: ScreenType): KnownScreen {
  return getDef(type).create(10) as KnownScreen
}

function openAdd() {
  dialog.value = {
    open: true,
    mode: 'add',
    index: null,
    form: defaultScreen('IMAGE'),
  }
}

function openEdit(i: number) {
  const orig = screensLocal.value[i]
  suppressTypeReset.value = true
  dialog.value = {
    open: true,
    mode: 'edit',
    index: i,
    form: JSON.parse(JSON.stringify(orig)), // clone to avoid mutating list
  }
  nextTick(() => {
    suppressTypeReset.value = false
  })
}

function closeDialog() {
  dialog.value.open = false
}

function copy(text: string) {
  if (!text) return
  navigator.clipboard.writeText(text).catch(() => {})
}

watch(
  () => dialog.value.form.screenType,
  (t) => {
    if (suppressTypeReset.value) return
    const duration = dialog.value.form.durationSeconds ?? 10
    dialog.value.form = { ...getDef(t as ScreenType).create(duration) } as KnownScreen
  },
)

// Resolve the per-type form component lazily, memoized per type so the
// wrapper (and its chunk) is created once — no remount churn on dialog reopen
const formComponentCache = new Map<ScreenType, Component>()
const FormSkeleton = () => h(VSkeletonLoader, { type: 'text@3', class: 'py-2' })

const CurrentForm = computed(() => {
  const t = dialog.value.form.screenType as ScreenType
  let comp = formComponentCache.get(t)
  if (!comp) {
    comp = defineAsyncComponent({
      loader: getDef(t).Form as unknown as () => Promise<Component>,
      loadingComponent: FormSkeleton,
      delay: 0,
    })
    formComponentCache.set(t, comp)
  }
  return comp
})

// Warm the form chunks (esp. the Leaflet-based map forms) in the background
// so the first dialog open is instant
function preloadForms() {
  for (const t of allScreenTypes) void getDef(t).Form().catch(() => {})
}
onMounted(() => {
  const w = window as Window & { requestIdleCallback?: (cb: () => void) => number }
  if (w.requestIdleCallback) w.requestIdleCallback(() => preloadForms())
  else setTimeout(preloadForms, 1500)
})

function mergeFormPatch(next: AnyScreen) {
  // keep the same root object so inputs don't lose focus
  Object.assign(dialog.value.form as Record<string, unknown>, next)
}

/* ---------- Persist order after drag/drop ---------- */
async function persistOrder() {
  const ordered = stripKeys(screensLocal.value)
  const newConfig: PanelConfig = {
    panelId: panelId.value,
    screensConfig: ordered,
  }
  try {
    await savePanelConfig(panelId.value, newConfig)
    if (panel.value) panel.value.config = newConfig
    // re-key to reflect new indices
    screensLocal.value = withKeys(ordered)
  } catch (e) {
    console.error(e)
    // revert UI if save fails
    screensLocal.value = withKeys(screens.value)
  }
}

/* ---------- Persist add/edit ---------- */
async function saveDialog() {
  const f = dialog.value.form
  if (!f.screenType || !f.durationSeconds || f.durationSeconds < 1) return

  const current = [...screensLocal.value]
  if (dialog.value.mode === 'add') {
    current.push({ ...(f as AnyScreen), __key: cryptoRandom() })
  } else if (dialog.value.mode === 'edit' && dialog.value.index != null) {
    const oldKey = screensLocal.value[dialog.value.index].__key
    current.splice(dialog.value.index, 1, { ...(f as AnyScreen), __key: oldKey })
  }

  const ordered = stripKeys(current)
  const newConfig: PanelConfig = {
    panelId: panelId.value,
    screensConfig: ordered,
  }

  try {
    await savePanelConfig(panelId.value, newConfig)
    if (panel.value) panel.value.config = newConfig
    screensLocal.value = withKeys(ordered)
    closeDialog()
  } catch (e) {
    console.error(e)
  }
}

// --- Delete dialog state ---
const deleteDialog = ref<{ open: boolean; index: number | null }>({
  open: false,
  index: null,
})

function openDelete(i: number) {
  deleteDialog.value.open = true
  deleteDialog.value.index = i
}

function closeDelete() {
  deleteDialog.value.open = false
  deleteDialog.value.index = null
}

async function confirmDelete() {
  const i = deleteDialog.value.index
  if (i == null) return

  // create a new array without the target item (preserve keys for UI until save)
  const current = [...screensLocal.value]
  current.splice(i, 1)

  // strip keys for persistence
  const ordered = stripKeys(current)
  const newConfig: PanelConfig = {
    panelId: panelId.value,
    screensConfig: ordered,
  }

  try {
    await savePanelConfig(panelId.value, newConfig)
    if (panel.value) panel.value.config = newConfig
    // re-key to reflect updated indices
    screensLocal.value = withKeys(ordered)
    closeDelete()
  } catch (e) {
    console.error(e)
    // optionally surface an error message
    error.value = 'Failed to delete screen.'
  }
}

//const panelTypeOptions = ref<string[]>(panelTypes)

const detailsFormRef = ref()
const detailsDialog = ref<{
  open: boolean
  valid: boolean
  saving: boolean
  form: {
    panelType: string
    name: string
    clientMac: string
    serial: string
  }
}>({
  open: false,
  valid: false,
  saving: false,
  form: { panelType: '', name: '', clientMac: '', serial: '' },
})

function openDetailsDialog() {
  if (!panel.value) return
  detailsDialog.value.form = {
    panelType: panel.value.panelType ?? '',
    name: panel.value.name ?? '',
    clientMac: panel.value.clientMac ?? '',
    serial: panel.value.serial ?? '',
  }
  detailsDialog.value.open = true
}

function closeDetailsDialog() {
  detailsDialog.value.open = false
}

// ---------- Validation rules ----------
const rules = {
  required: (v: string) => (!!v && v.trim().length > 0) || 'Required',
  maxLen: (n: number) => (v: string) => !v || v.length <= n || `Max ${n} characters`,
  mac: (v: string) => {
    if (!v) return 'Required'
    const norm = normalizeMac(v)
    return /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(norm) || 'Use format AA:BB:CC:DD:EE:FF'
  },
}

// Normalize any MAC input to colon-separated lowercase
function normalizeMac(input: string): string {
  const hex = (input || '').replace(/[^0-9a-fA-F]/g, '').toLowerCase()
  if (hex.length !== 12) return input // let rule catch invalids; don't mangle
  return hex.match(/.{1,2}/g)!.join(':')
}

async function saveDetails() {
  // Validate form
  const form = detailsFormRef.value as { validate: () => Promise<{ valid: boolean }> } | undefined
  if (form) {
    const { valid } = await form.validate()
    if (!valid) return
  }

  if (!panel.value) return

  detailsDialog.value.saving = true
  const payload = {
    panelType: detailsDialog.value.form.panelType?.trim(),
    name: detailsDialog.value.form.name?.trim(),
    clientMac: normalizeMac(detailsDialog.value.form.clientMac || ''),
    serial: detailsDialog.value.form.serial?.trim(),
  }

  try {
    // Only send the 4 editable fields
    await updatePanelDetails(panel.value.panelId, payload)

    // Reflect changes locally
    panel.value = {
      ...panel.value,
      panelType: payload.panelType,
      name: payload.name,
      clientMac: payload.clientMac,
      serial: payload.serial,
    }

    firstFramePending.value = true
    imgSrc.value = undefined

    await connectSse(panel.value.panelId)

    detailsDialog.value.open = false
  } catch (e) {
    error.value = 'Failed to save panel details: ' + e
  } finally {
    detailsDialog.value.saving = false
  }
}
</script>
<style scoped>
.drag-handle {
  cursor: grab;
}
.drag-handle:active {
  cursor: grabbing;
}

.preview-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 24px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.preview-frame {
  max-width: 100%;
  width: 100%;
  image-rendering: pixelated;
  border-radius: 4px;
}

.raw-json {
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-size: 0.8rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
}
</style>
