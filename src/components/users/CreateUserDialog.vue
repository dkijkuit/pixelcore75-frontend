<template>
  <v-dialog v-model="model" max-width="640">
    <v-card>
      <v-card-title class="text-subtitle-1 font-weight-medium pt-4 px-6"
        >Create new user</v-card-title
      >
      <v-card-text>
        <v-form ref="formRef" v-model="valid">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.trim="f.username"
                label="Username"
                :rules="[req]"
                autocomplete="off"
                required
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.trim="f.email"
                label="Email"
                :rules="[req, email]"
                autocomplete="email"
                required
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="f.password"
                :type="showPw ? 'text' : 'password'"
                label="Password"
                :append-inner-icon="showPw ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPw = !showPw"
                :rules="[req]"
                autocomplete="new-password"
                required
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="f.roles"
                :items="roleItems"
                item-title="title"
                item-value="value"
                multiple
                chips
                closable-chips
                label="Roles"
                hint="Select one or more roles"
                persistent-hint
              />
            </v-col>
          </v-row>
        </v-form>
        <v-alert v-if="error" type="error" class="mt-2">{{ error }}</v-alert>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="submitting" :disabled="!valid" @click="submit"
          >Create</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { ref, reactive, watch } from 'vue'
import type { CreateUserPayload } from '@/types/users'
import { toServerRole } from '@/utils/roles'
import { getErrorMessage } from '@/utils/errors'

const props = defineProps<{
  modelValue: boolean
  roleItems: Array<{ title: string; value: string }>
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'submit', payload: CreateUserPayload): void
}>()

const model = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => (model.value = v),
)
watch(model, (v) => emit('update:modelValue', v))

const formRef = ref()
const valid = ref(false)
const showPw = ref(false)
const submitting = ref(false)
const error = ref('')
const req = (v: string) => !!v || 'Required'
const email = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Invalid email'

const f = reactive<{ username: string; email: string; password: string; roles: string[] }>({
  username: '',
  email: '',
  password: '',
  roles: ['USER'],
})

function reset() {
  f.username = ''
  f.email = ''
  f.password = ''
  f.roles = ['USER']
  error.value = ''
}

function close() {
  model.value = false
}

async function submit() {
  await formRef.value?.validate()
  if (!valid.value) return
  submitting.value = true
  error.value = ''
  try {
    const payload: CreateUserPayload = {
      username: f.username,
      email: f.email,
      password: f.password,
      roles: f.roles.map(toServerRole), // send enum names (USER/ADMIN)
    }
    emit('submit', payload)
    reset()
    close()
  } catch (e) {
    error.value = getErrorMessage(e, 'Create failed')
  } finally {
    submitting.value = false
  }
}
</script>
