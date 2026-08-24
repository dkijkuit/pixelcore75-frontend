<template>
  <div class="d-flex flex-column ga-6">
    <!-- Header -->
    <div class="d-flex align-center flex-wrap ga-3">
      <span class="text-h5 font-weight-medium">Custom Screens</span>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">New screen</v-btn>
    </div>

    <v-alert v-if="error" type="error">{{ error }}</v-alert>
    <v-skeleton-loader v-if="loading" type="article" />

    <template v-else>
      <!-- My screens -->
      <div v-if="mine.length">
        <div class="text-subtitle-1 font-weight-medium mb-3">My screens</div>
        <v-row dense>
          <v-col v-for="s in mine" :key="s.id" cols="12" sm="6" md="4" lg="3">
            <v-card class="screen-card" height="100%">
              <v-card-item>
                <div class="d-flex align-start">
                  <img
                    v-if="s.thumbnail"
                    :src="s.thumbnail"
                    :alt="s.name"
                    class="rounded thumbnail mr-3"
                  />
                  <div
                    v-else
                    class="rounded thumbnail thumbnail-empty mr-3 d-flex align-center justify-center"
                  >
                    <v-icon size="small" color="medium-emphasis">mdi-drawing-box</v-icon>
                  </div>
                  <div class="flex-grow-1 overflow-hidden">
                    <div class="text-body-1 font-weight-medium text-truncate" :title="s.name">
                      {{ s.name }}
                    </div>
                    <div class="d-flex flex-wrap ga-1 mt-1">
                      <v-chip size="x-small" variant="tonal" label>{{ s.durationSeconds }}s</v-chip>
                      <v-chip v-if="s.shared" size="x-small" color="primary" variant="tonal" label>
                        shared
                      </v-chip>
                    </div>
                  </div>
                </div>
              </v-card-item>
              <v-card-actions class="pt-0">
                <v-btn size="small" variant="text" prepend-icon="mdi-pencil" @click="openEdit(s)">
                  Edit
                </v-btn>
                <v-btn
                  size="small"
                  variant="text"
                  :prepend-icon="s.shared ? 'mdi-share-off' : 'mdi-share-variant'"
                  @click="toggleShared(s)"
                >
                  {{ s.shared ? 'Unshare' : 'Share' }}
                </v-btn>
                <v-spacer />
                <v-btn
                  icon="mdi-content-copy"
                  size="small"
                  variant="text"
                  :aria-label="`Duplicate ${s.name}`"
                  @click="duplicate(s)"
                />
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  color="error"
                  :aria-label="`Delete ${s.name}`"
                  @click="openDelete(s)"
                />
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <v-alert
        v-if="!mine.length"
        type="info"
        variant="tonal"
        icon="mdi-drawing-box"
        class="py-6"
      >
        No custom screens yet. Create one and add it to any of your panels — every panel
        using a screen always shows its latest saved design.
      </v-alert>

      <!-- Other users' screens -->
      <div v-if="others.length">
        <div class="text-subtitle-1 font-weight-medium mb-1">Other users' screens</div>
        <div class="text-caption text-medium-emphasis mb-3">
          Shared screens can be added to your panels and duplicated into your library.
        </div>
        <v-row dense>
          <v-col v-for="s in others" :key="s.id" cols="12" sm="6" md="4" lg="3">
            <v-card height="100%">
              <v-card-item>
                <div class="d-flex align-start">
                  <img
                    v-if="s.thumbnail"
                    :src="s.thumbnail"
                    :alt="s.name"
                    class="rounded thumbnail mr-3"
                  />
                  <div
                    v-else
                    class="rounded thumbnail thumbnail-empty mr-3 d-flex align-center justify-center"
                  >
                    <v-icon size="small" color="medium-emphasis">mdi-drawing-box</v-icon>
                  </div>
                  <div class="flex-grow-1 overflow-hidden">
                    <div class="text-body-1 font-weight-medium text-truncate" :title="s.name">
                      {{ s.name }}
                    </div>
                    <div class="d-flex flex-wrap ga-1 mt-1">
                      <v-chip size="x-small" variant="tonal" label>
                        {{ s.ownerUsername }}
                      </v-chip>
                      <v-chip v-if="!s.shared" size="x-small" variant="tonal" label>private</v-chip>
                    </div>
                  </div>
                </div>
              </v-card-item>
              <v-card-actions class="pt-0">
                <v-btn
                  size="small"
                  variant="text"
                  prepend-icon="mdi-content-copy"
                  @click="duplicate(s)"
                >
                  Duplicate
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </div>
    </template>

    <!-- Create / edit dialog: the full designer, fullscreen -->
    <v-dialog v-model="editor.open" fullscreen scrollable>
      <v-card class="d-flex flex-column">
        <v-toolbar density="comfortable" color="surface" border="b">
          <v-btn icon="mdi-close" aria-label="Cancel" @click="closeEditor" />
          <v-toolbar-title class="text-subtitle-1 font-weight-medium">
            {{ editor.mode === 'create' ? 'New custom screen' : `Edit “${editor.originalName}”` }}
          </v-toolbar-title>
          <v-spacer />
          <v-switch
            v-model="editor.shared"
            label="Shared"
            color="primary"
            density="compact"
            hide-details
            inset
            class="mr-2"
          />
          <v-btn variant="text" class="ml-2" @click="closeEditor">Cancel</v-btn>
          <v-btn
            color="primary"
            class="ml-2"
            :loading="editor.saving"
            :disabled="!editor.dirty"
            @click="save"
          >
            Save
          </v-btn>
        </v-toolbar>

        <v-card-text class="flex-grow-1 overflow-auto py-6">
          <div class="editor-content">
            <v-alert v-if="editor.error" type="error" density="compact" class="mb-4">
              {{ editor.error }}
            </v-alert>
            <div class="d-flex justify-end mb-4">
              <span class="text-caption text-medium-emphasis">
                Edits apply live to every panel using this screen.
              </span>
            </div>
            <CustomForm
              v-if="editor.open"
              :model-value="editor.draft"
              @update:model-value="onDraftUpdate"
            />
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Delete confirm -->
    <v-dialog v-model="deleteDialog.open" max-width="440">
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-medium pt-4 px-6">
          Delete custom screen
        </v-card-title>
        <v-card-text>
          <template v-if="deleteDialog.loading"><v-progress-circular indeterminate /></template>
          <template v-else-if="deleteDialog.screen">
            Delete <strong>{{ deleteDialog.screen.name }}</strong
            >? This action can’t be undone.
            <v-alert
              v-if="deleteDialog.usageCount > 0"
              type="warning"
              density="compact"
              variant="tonal"
              class="mt-3"
            >
              {{ deleteDialog.usageCount }} panel configuration{{ deleteDialog.usageCount === 1 ? '' : 's' }}
              reference this screen — those panels will skip it until their rotation is saved
              again.
            </v-alert>
          </template>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog.open = false">Cancel</v-btn>
          <v-btn color="error" :loading="deleteDialog.deleting" @click="confirmDelete">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :timeout="2500">{{ snackbar.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  createCustomScreen,
  deleteCustomScreen,
  fetchCustomScreen,
  listCustomScreens,
  updateCustomScreen,
  type CustomScreen,
} from '@/service/customScreens.ts'
import { emptyDesign, type PxdDoc } from '@/types/pxd.ts'
import CustomForm from '@/components/screens/CustomForm.vue'

type CustomFormModel = { screenType: 'CUSTOM'; durationSeconds: number; design: string }

const loading = ref(true)
const error = ref('')
const screens = ref<CustomScreen[]>([])

const mine = computed(() => screens.value.filter((s) => s.owned))
const others = computed(() => screens.value.filter((s) => !s.owned))

const snackbar = reactive({ show: false, text: '' })
function toast(text: string) {
  snackbar.text = text
  snackbar.show = true
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    screens.value = await listCustomScreens()
  } catch (e) {
    error.value = 'Failed to load custom screens: ' + (e instanceof Error ? e.message : String(e))
  } finally {
    loading.value = false
  }
}
onMounted(load)

/* ---------------- Editor dialog ---------------- */

const editor = ref<{
  open: boolean
  mode: 'create' | 'edit'
  id: number | null
  originalName: string
  draft: CustomFormModel
  shared: boolean
  dirty: boolean
  saving: boolean
  error: string
}>({
  open: false,
  mode: 'create',
  id: null,
  originalName: '',
  draft: emptyDraft(),
  shared: false,
  dirty: false,
  saving: false,
  error: '',
})

function emptyDraft(): CustomFormModel {
  return {
    screenType: 'CUSTOM',
    durationSeconds: 10,
    design: JSON.stringify(emptyDesign()),
  }
}

function openCreate() {
  editor.value = {
    open: true,
    mode: 'create',
    id: null,
    originalName: '',
    draft: emptyDraft(),
    shared: false,
    dirty: false,
    saving: false,
    error: '',
  }
}

async function openEdit(s: CustomScreen) {
  try {
    const detail = await fetchCustomScreen(s.id)
    const draft: CustomFormModel = {
      screenType: 'CUSTOM',
      durationSeconds: detail.durationSeconds,
      design: detail.design ?? JSON.stringify(emptyDesign()),
    }
    editor.value = {
      open: true,
      mode: 'edit',
      id: detail.id,
      originalName: detail.name,
      draft,
      shared: detail.shared,
      dirty: false,
      saving: false,
      error: '',
    }
  } catch (e) {
    toast('Failed to load screen: ' + (e instanceof Error ? e.message : String(e)))
  }
}

function onDraftUpdate(next: CustomFormModel) {
  // CustomForm only emits when the design is valid; keep the duration it carries
  editor.value.draft = next
  editor.value.dirty = true
}

function closeEditor() {
  editor.value.open = false
}

async function save() {
  const e = editor.value
  if (!e.dirty || e.saving) return
  e.saving = true
  e.error = ''
  const payload = {
    design: e.draft.design,
    durationSeconds: e.draft.durationSeconds,
    shared: e.shared,
  }
  try {
    if (e.mode === 'create') {
      await createCustomScreen(payload)
      toast('Custom screen saved')
    } else {
      await updateCustomScreen(e.id!, payload)
      toast('Custom screen updated')
    }
    e.open = false
    await load()
  } catch (err) {
    e.error = err instanceof Error ? err.message : String(err)
  } finally {
    e.saving = false
  }
}

/* ---------------- Card actions ---------------- */

async function toggleShared(s: CustomScreen) {
  try {
    const detail = await fetchCustomScreen(s.id)
    await updateCustomScreen(s.id, {
      design: detail.design ?? JSON.stringify(emptyDesign()),
      durationSeconds: detail.durationSeconds,
      shared: !detail.shared,
    })
    await load()
  } catch (e) {
    toast('Failed to update: ' + (e instanceof Error ? e.message : String(e)))
  }
}

/** Copy into my library with a “ (copy)” name suffix (the name lives inside the design). */
async function duplicate(s: CustomScreen) {
  try {
    const detail = await fetchCustomScreen(s.id)
    const doc = JSON.parse(detail.design ?? JSON.stringify(emptyDesign())) as PxdDoc
    doc.name = `${doc.name} (copy)`.slice(0, 64)
    await createCustomScreen({
      design: JSON.stringify(doc),
      durationSeconds: detail.durationSeconds,
      shared: false,
    })
    toast(`Duplicated “${s.name}” into your library`)
    await load()
  } catch (e) {
    toast('Failed to duplicate: ' + (e instanceof Error ? e.message : String(e)))
  }
}

/* ---------------- Delete ---------------- */

const deleteDialog = ref<{
  open: boolean
  loading: boolean
  deleting: boolean
  screen: CustomScreen | null
  usageCount: number
}>({ open: false, loading: false, deleting: false, screen: null, usageCount: 0 })

async function openDelete(s: CustomScreen) {
  deleteDialog.value = { open: true, loading: true, deleting: false, screen: s, usageCount: 0 }
  try {
    const detail = await fetchCustomScreen(s.id)
    deleteDialog.value.usageCount = detail.usageCount ?? 0
  } catch {
    deleteDialog.value.usageCount = 0
  } finally {
    deleteDialog.value.loading = false
  }
}

async function confirmDelete() {
  const s = deleteDialog.value.screen
  if (!s) return
  deleteDialog.value.deleting = true
  try {
    await deleteCustomScreen(s.id)
    deleteDialog.value.open = false
    toast(`Deleted “${s.name}”`)
    await load()
  } catch (e) {
    toast('Failed to delete: ' + (e instanceof Error ? e.message : String(e)))
  } finally {
    deleteDialog.value.deleting = false
  }
}
</script>

<style scoped>
.editor-content {
  max-width: 1440px;
  margin: 0 auto;
}

.thumbnail {
  width: 96px;
  height: 48px;
  object-fit: contain;
  image-rendering: pixelated;
  background: rgba(var(--v-theme-on-surface), 0.08);
  flex-shrink: 0;
}

.thumbnail-empty {
  display: flex;
}
</style>
