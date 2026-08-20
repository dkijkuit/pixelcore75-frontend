<template>
  <div class="d-flex flex-column ga-6">
    <div class="d-flex align-center flex-wrap ga-2">
      <v-btn
        v-if="user.roles.includes('ADMIN')"
        icon="mdi-arrow-left"
        variant="text"
        density="comfortable"
        @click="goBack"
      />
      <div>
        <div class="text-h5 font-weight-medium">{{ user.username }}</div>
        <div class="text-body-2 text-medium-emphasis">{{ user.email || `User #${user.id}` }}</div>
      </div>
      <v-spacer />
      <v-btn
        :loading="saving"
        color="primary"
        prepend-icon="mdi-content-save"
        @click="onSave"
        :disabled="!isDirty || !formValid"
      >
        Save
      </v-btn>
      <v-btn variant="text" @click="resetLocal" :disabled="!isDirty">Reset</v-btn>
    </div>

    <v-alert v-if="error" type="error">{{ error }}</v-alert>

    <v-skeleton-loader v-if="loading" type="card" />

    <v-card v-else>
      <v-card-text>
        <div class="text-subtitle-1 font-weight-medium mb-4">Profile</div>
        <v-form v-model="formValid" ref="formRef">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                label="Username"
                disabled
                v-model.trim="edit.username"
                :rules="[(v) => !!v || 'Username is required']"
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
            <div class="text-subtitle-1 font-weight-medium mb-1">Security</div>
            <div class="text-body-2 text-medium-emphasis">Reset the user's password.</div>
          </v-col>
          <v-col cols="12" md="4" class="text-md-right">
            <v-btn
              color="warning"
              variant="tonal"
              prepend-icon="mdi-lock-reset"
              @click="showPwDialog = true"
            >
              Reset password
            </v-btn>
          </v-col>
        </v-row>

        <template v-if="isAdmin">
          <v-divider class="my-6" />
          <v-row>
            <v-col cols="12" md="8">
              <div
                class="text-subtitle-1 font-weight-medium mb-1"
                style="color: rgb(var(--v-theme-error))"
              >
                Danger zone
              </div>
              <div class="text-body-2 text-medium-emphasis">
                Permanently remove this user and revoke all access.
              </div>
            </v-col>
            <v-col cols="12" md="4" class="text-md-right">
              <v-btn
                color="error"
                variant="tonal"
                prepend-icon="mdi-delete-outline"
                @click="showDeleteDialog = true"
              >
                Delete user
              </v-btn>
            </v-col>
          </v-row>
        </template>
      </v-card-text>
    </v-card>

    <!-- Password dialog -->
    <v-dialog v-model="showPwDialog" max-width="520">
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-medium pt-4 px-6"
          >Reset password</v-card-title
        >
        <v-card-text>
          <v-text-field
            v-model="newPassword"
            label="New password"
            type="password"
            :rules="[(v) => !!v || 'Password is required']"
            autocomplete="new-password"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showPwDialog = false">Cancel</v-btn>
          <v-btn color="warning" :loading="pwSaving" @click="onResetPassword">Update</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete confirm -->
    <v-dialog v-model="showDeleteDialog" max-width="520">
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-medium pt-4 px-6"
          >Delete user?</v-card-title
        >
        <v-card-text>
          This action cannot be undone. User <strong>{{ user.username }}</strong> will be
          permanently removed.
        </v-card-text>
        <v-card-actions class="pa-4">
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
import type { Role, User, UpdateUserPayload } from '@/types/users.ts'
import { fetchUser, updateUser, resetUserPassword, deleteUser } from '@/service/users.ts'
import { getErrorMessage } from '@/utils/errors'

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
const edit = reactive<{ username: string; email: string; roles: Role[] }>({
  username: '',
  email: '',
  roles: [],
})

// Offer common roles; also merge any unknown roles from the user to avoid hiding them
const baseRoleOptions: Role[] = ['ADMIN', 'USER', 'MODERATOR']
const roleOptions = computed<Role[]>(() => Array.from(new Set([...baseRoleOptions, ...user.roles])))

const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Invalid email',
]

const isAdmin = computed(() => {
  return user.roles.includes('ADMIN')
})

// helpers
function takePayload(): UpdateUserPayload {
  const payload: UpdateUserPayload = {}
  if (edit.username !== user.username) payload.username = edit.username
  if (edit.email !== user.email) payload.email = edit.email
  // compare roles shallowly
  const sameRoles =
    edit.roles.length === user.roles.length && edit.roles.every((r) => user.roles.includes(r))
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
  } catch (e) {
    error.value = getErrorMessage(e, 'Failed to load user.')
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
  } catch (e) {
    error.value = getErrorMessage(e, 'Update failed.')
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
  } catch (e) {
    error.value = getErrorMessage(e, 'Password update failed.')
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
  } catch (e) {
    error.value = getErrorMessage(e, 'Delete failed.')
  } finally {
    deleting.value = false
  }
}
</script>
