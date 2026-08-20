<template>
  <v-dialog v-model="model" max-width="520">
    <v-card>
      <v-card-title class="text-subtitle-1 font-weight-medium pt-4 px-6">Add Panel</v-card-title>

      <v-card-text>
        <v-form v-model="isValid" class="d-flex flex-column ga-3" @submit.prevent="onSubmit">
          <v-text-field
            v-model="form.username"
            label="Owner"
            readonly
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            prepend-inner-icon="mdi-account-outline"
          />

          <v-text-field
            v-model="form.name"
            label="Name"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
          />

          <v-text-field
            v-model="form.serial"
            label="Serial"
            :rules="[rules.required]"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            required
          />

          <v-text-field
            v-model="form.clientMac"
            label="Client MAC (AA:BB:CC:DD:EE:FF)"
            :rules="[rules.required, rules.mac]"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            required
          />

          <v-select
            v-model="form.panelType"
            :items="panelTypes"
            label="Panel Type"
            :rules="[rules.required]"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            required
          />

          <v-alert v-if="error" type="error">
            {{ error }}
          </v-alert>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="onCancel">Cancel</v-btn>
        <v-btn
          color="primary"
          :loading="submitting"
          :disabled="!isValid || submitting"
          @click="onSubmit"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { AxiosError } from 'axios'
import { createPanel, type CreatePanelRequest, type Px75Panel } from '@/service/panels.ts'
import { useAuthStore } from '@/stores/AuthStore.ts'
import { panelTypes } from '@/utils/panels.ts'

const props = defineProps<{ modelValue: boolean; preset?: Partial<CreatePanelRequest> }>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'created', p: Px75Panel): void
  (e: 'cancel'): void
}>()

const model = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const isValid = ref(false)
const submitting = ref(false)
const error = ref('')

const auth = useAuthStore()

// hidden userId, visible readonly username
const form = ref<CreatePanelRequest>({
  userId: auth.user?.id ?? 0,
  username: auth.user?.username ?? '',
  serial: '',
  clientMac: '',
  name: '',
  panelType: '',
})

const rules = {
  required: (v: unknown) => (v != null && String(v).trim() !== '') || 'Required',
  mac: (v: string) => /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(v) || 'Invalid MAC address',
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      form.value = {
        userId: auth.user?.id ?? 0,
        username: auth.user?.username ?? '',
        serial: props.preset?.serial ?? '',
        name: props.preset?.name ?? '',
        clientMac: props.preset?.clientMac ?? '',
        panelType: props.preset?.panelType ?? '',
      }
      error.value = ''
    }
  },
)

async function onSubmit() {
  error.value = ''
  submitting.value = true
  try {
    const created = await createPanel(form.value) // includes hidden userId
    emit('created', created)
    model.value = false
  } catch (e: unknown) {
    const err = e as AxiosError<{ message?: string }>
    error.value = err.response?.data?.message ?? 'Failed to create panel.'
  } finally {
    submitting.value = false
  }
}

function onCancel() {
  emit('cancel')
  model.value = false
}
</script>
