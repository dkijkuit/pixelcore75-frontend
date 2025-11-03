<template>
  <div class="pa-2 pa-sm-4">
      <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

    <v-skeleton-loader v-if="loading" type="card" class="mb-4" />

    <v-card v-else class="elevation-2">
      <v-toolbar density="comfortable" color="transparent">
        <v-btn icon @click="goBack" v-if="user.roles.includes('ADMIN')"><v-icon>mdi-arrow-left</v-icon></v-btn>
        <v-toolbar-title>User: {{ user.username }}</v-toolbar-title>
        <v-spacer />
        <v-btn :loading="saving" color="primary" @click="onSave" :disabled="!isDirty || !formValid">
          <v-icon start>mdi-content-save</v-icon>Save
        </v-btn>
        <v-btn variant="text" color="secondary" @click="resetLocal" :disabled="!isDirty">Reset</v-btn>
      </v-toolbar>

      <v-divider />

      <v-card-text>
        <v-form v-model="formValid" ref="formRef">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                label="Username"
                disabled
                v-model.trim="edit.username"
                :rules="[v => !!v || 'Username is required']"
                autocomplete="off"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                label="Email"
                v-model.trim="edit.email"
                :rules="emailRules"
                autocomplete="off"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                label="Roles"
                v-model="edit.roles"
                :items="roleOptions"
                multiple
                chips
                closable-chips
                hint="Select one or more roles"
                persistent-hint
                :disabled="!isAdmin"
              />
            </v-col>
          </v-row>
        </v-form>

        <v-divider class="my-6" />

        <v-row class="align-center">
          <v-col cols="12" md="8">
            <div class="text-subtitle-1 font-weight-medium mb-2">Security</div>
            <div class="text-body-2">Reset the user's password.</div>
          </v-col>
          <v-col cols="12" md="4" class="text-md-right">
            <v-btn color="warning" variant="elevated" @click="showPwDialog = true">
              <v-icon start>mdi-lock-reset</v-icon>Reset password
            </v-btn>
          </v-col>
        </v-row>

        <v-divider class="my-6" />

        <v-row v-if="isAdmin  ">
          <v-col cols="12" class="d-flex justify-end">
            <v-btn color="error" variant="outlined" @click="showDeleteDialog = true">
              <v-icon start>mdi-delete</v-icon>Delete user
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Password dialog -->
    <v-dialog v-model="showPwDialog" max-width="520">
      <v-card>
        <v-card-title>Reset Password</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newPassword"
            label="New password"
            type="password"
            :rules="[v => !!v || 'Password is required']"
            autocomplete="new-password"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showPwDialog = false">Cancel</v-btn>
          <v-btn color="warning" :loading="pwSaving" @click="onResetPassword">Update</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete confirm -->
    <v-dialog v-model="showDeleteDialog" max-width="520">
      <v-card>
        <v-card-title>Delete user?</v-card-title>
        <v-card-text>
          This action cannot be undone. User <strong>{{ user.username }}</strong> will be permanently removed.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deleting" @click="onDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :timeout="2500">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { Role, User, UpdateUserPayload } from '@/service/users.ts'
import { fetchUser, updateUser, resetUserPassword, deleteUser } from '@/service/users.ts'

const props = defineProps<{ id: string | number }>()
const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const pwSaving = ref(false)
const deleting = ref(false)
const error = ref('')
const formValid = ref(false)
const formRef = ref()
const showPwDialog = ref(false)
const showDeleteDialog = ref(false)
const newPassword = ref('')

const user = reactive<User>({ id: 0, username: '', email: '', roles: [] })
const edit = reactive<{ username: string; email: string; roles: Role[] }>({ username: '', email: '', roles: [] })

// Offer common roles; also merge any unknown roles from the user to avoid hiding them
const baseRoleOptions: Role[] = ['ADMIN', 'USER', 'MODERATOR']
const roleOptions = computed<Role[]>(() => Array.from(new Set([...baseRoleOptions, ...user.roles])))

const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Invalid email',
]

const isAdmin = computed(() => { return user.roles.includes('ADMIN') });

// helpers
function takePayload(): UpdateUserPayload {
  const payload: UpdateUserPayload = {}
  if (edit.username !== user.username) payload.username = edit.username
  if (edit.email !== user.email) payload.email = edit.email
  // compare roles shallowly
  const sameRoles = edit.roles.length === user.roles.length && edit.roles.every(r => user.roles.includes(r))
  if (!sameRoles) payload.roles = [...edit.roles]
  return payload
}

const isDirty = computed(() => {
  const p = takePayload()
  return Object.keys(p).length > 0
})

function resetLocal() {
  edit.username = user.username
  edit.email = user.email
  edit.roles = [...user.roles]
}

function goBack() {
  router.push({ name: 'dashboard-users' })
}

const snackbar = reactive({ show: false, text: '' })
function toast(t: string) {
  snackbar.text = t
  snackbar.show = true
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const idNum = Number(props.id)
    const data = await fetchUser(idNum)
    Object.assign(user, data)
    resetLocal()
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Failed to load user.'
  } finally {
    loading.value = false
  }
})

function takeFullPutPayload(): UpdateUserPayload {
  // always send full object for PUT
  return {
    username: edit.username,
    email: edit.email,
    roles: [...edit.roles], // keep server-shaped values
    // password is optional, omit unless you’re changing it
  }
}

async function onSave() {
  await formRef.value?.validate()
  if (!formValid.value) return

  saving.value = true
  error.value = ''
  try {
    const updated = await updateUser(user.id, takeFullPutPayload())
    Object.assign(user, updated)
    resetLocal()
    toast('User updated')
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Update failed.'
  } finally {
    saving.value = false
  }
}

async function onResetPassword() {
  if (!newPassword.value) return
  pwSaving.value = true
  error.value = ''
  try {
    await resetUserPassword(user.id, newPassword.value)
    showPwDialog.value = false
    newPassword.value = ''
    toast('Password updated')
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Password update failed.'
  } finally {
    pwSaving.value = false
  }
}

async function onDelete() {
  deleting.value = true
  error.value = ''
  try {
    await deleteUser(user.id)
    showDeleteDialog.value = false
    toast('User deleted')
    goBack()
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Delete failed.'
  } finally {
    deleting.value = false
  }
}
</script>
