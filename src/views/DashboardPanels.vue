<template>
  <v-card>
    <v-toolbar flat density="comfortable" class="mb-4 flex-wrap gap-2">
      <v-text-field
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        label="Search"
        variant="outlined"
        density="comfortable"
        hide-details
        clearable
        style="max-width: 280px"
      />
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate = true"> Add Panel </v-btn>
    </v-toolbar>

    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
    <v-skeleton-loader v-if="loading" type="table" class="mb-4" />

    <div ref="tableAnchor">
      <PanelsTable :panels="filteredPanels" :height="tableHeight" @rowClick="goToDetails" @delete="askDelete"/>
    </div>

    <v-dialog v-model="deleteOpen" max-width="520">
      <v-card>
        <v-card-title>Delete panel?</v-card-title>
        <v-card-text>
          This action cannot be undone.
          <div v-if="pending" class="mt-2">
            Panel: <strong>#{{ pending.panelId }}</strong>
            <div class="text-caption">{{ pending.name }} — {{ pending.serial }}</div>
          </div>
          <v-alert v-if="deleteError" type="error" class="mt-3">{{ deleteError }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteOpen = false">Cancel</v-btn>
          <v-btn color="error" :loading="deleting" @click="confirmDelete">
            <v-icon start>mdi-delete</v-icon>Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :timeout="2200">
      {{ snackbar.text }}
    </v-snackbar>

    <PanelCreateDialog v-model="openCreate" @created="handleCreated" />
  </v-card>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import type { AxiosError } from 'axios'
import PanelsTable from '@/components/panels/PanelsTable.vue'
import PanelCreateDialog from '@/components/panels/PanelCreateDialog.vue' // keep your existing dialog
import { fetchPanels } from '@/service/api'
import type { Px75Panel } from '@/service/panels'
import { getScreenTypesUnique } from '@/utils/panels'
import { useDynamicTableHeight } from '@/composables/useDynamicTableHeight'
import { deletePanel } from '@/service/panels.ts'

const panels = ref<Px75Panel[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const userFilter = ref<number | null>(null) // keep if you filter by user id
const openCreate = ref(false)
const router = useRouter()

const { tableSlot: tableAnchor, tableHeight, recalc } = useDynamicTableHeight(200, 20)

const filteredPanels = computed(() => {
  const q = search.value.trim().toLowerCase()
  return panels.value.filter((p) => {
    const types = getScreenTypesUnique(p)
    const matchesSearch =
      !q ||
      String(p.panelId).includes(q) ||
      p.username?.toLowerCase().includes(q) ||
      p.clientMac?.toLowerCase().includes(q) ||
      p.serial?.toLowerCase().includes(q) ||
      p.panelType?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q) ||
      types.some((t) => t.toLowerCase().includes(q))
    const matchesUser = userFilter.value == null || p.userId === userFilter.value
    return matchesSearch && matchesUser
  })
})

onMounted(async () => {
  try {
    panels.value = await fetchPanels()
  } catch (e: unknown) {
    const err = e as AxiosError<{ message?: string }>
    error.value = err.response?.data?.message ?? 'Failed to load panels.'
  } finally {
    loading.value = false
    // ensure height recalculates after first render
    queueMicrotask(recalc)
  }
})

function goToDetails(panel: Px75Panel) {
  router.push({ name: 'panel-details', params: { id: panel.panelId } })
}

async function handleCreated(_panel: Px75Panel) {
  panels.value = await fetchPanels()
  queueMicrotask(recalc)
}

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const pending = ref<Px75Panel | null>(null)
const snackbar = reactive({ show: false, text: '' })
const toast = (t: string) => ((snackbar.text = t), (snackbar.show = true))

function askDelete(p: Px75Panel) {
  deleteError.value = ''
  pending.value = p
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!pending.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await deletePanel(pending.value.panelId)
    // remove locally
    panels.value = panels.value.filter(x => x.panelId !== pending.value!.panelId)
    toast('Panel deleted')
    deleteOpen.value = false
  } catch (e: any) {
    deleteError.value = e?.response?.data?.message ?? 'Failed to delete panel.'
  } finally {
    deleting.value = false
  }
}
</script>
