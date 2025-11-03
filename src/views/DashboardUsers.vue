<template>
  <div class="dashboard-users">
    <v-toolbar color="transparent" density="comfortable" class="px-0">
      <v-toolbar-title>Users</v-toolbar-title>
      <v-spacer />
      <v-btn v-if="canManageUsers" color="primary" @click="createOpen = true">
        <v-icon start>mdi-account-plus</v-icon>New user
      </v-btn>
    </v-toolbar>

    <div ref="tableAnchor">
      <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
      <v-skeleton-loader v-if="loading" type="table" class="mb-4" />

      <UsersTable
        v-else
        :users="users"
        :can-manage-users="canManageUsers"
        :height="tableHeight"
        @rowClick="goToDetails"
        @delete="askDelete"
        ref="tableSlot"
      />
    </div>

    <CreateUserDialog v-model="createOpen" :role-items="roleItems" @submit="handleCreate" />

    <DeleteUserDialog
      v-model="deleteOpen"
      :user="pendingDelete"
      :loading="deleting"
      :error="deleteError"
      @confirm="handleDelete"
    />

    <v-snackbar v-model="snackbar.show" :timeout="2500">{{ snackbar.text }}</v-snackbar>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted } from 'vue'
import router from '@/router'
import { useAuthStore } from '@/stores/AuthStore.ts'
import { createUser, fetchUsers, deleteUser as apiDeleteUser } from '@/service/users.ts'
import type { CreateUserPayload, Px75User } from '@/types/users.ts'
import UsersTable from '@/components/users/UsersTable.vue'
import CreateUserDialog from '@/components/users/CreateUserDialog.vue'
import DeleteUserDialog from '@/components/users/DeleteUserDialog.vue'
import { useDynamicTableHeight } from '@/composables/useDynamicTableHeight.ts'
import { buildRoleItems } from '@/utils/roles.ts'
import { isAxiosError } from 'axios'

const auth = useAuthStore()
const canManageUsers = computed(() => {
  const roles: string[] = auth.user?.roles ?? []
  return roles.some((r) => r === 'ADMIN' || r === 'ROLE_ADMIN')
})

const users = ref<Px75User[]>([])
const loading = ref(true)
const error = ref('')

const { tableSlot: tableAnchor, tableHeight } = useDynamicTableHeight(200, 20)

const roleItems = computed(() => buildRoleItems(users.value).items)

onMounted(async () => {
  try {
    users.value = await fetchUsers()
  } catch (err) {
    if (isAxiosError<{ message?: string }>(err)) {
      error.value = err.response?.data?.message ?? 'Failed to load users'
    } else {
      error.value = 'Failed to load users'
    }
  } finally {
    loading.value = false
  }
})

function goToDetails(u: Px75User) {
  router.push({ name: 'dashboard-user-details', params: { id: u.id } })
}

/* Create */
const createOpen = ref(false)
const snackbar = reactive({ show: false, text: '' })
function toast(t: string) {
  snackbar.text = t
  snackbar.show = true
}

async function handleCreate(payload: CreateUserPayload) {
  try {
    const created = await createUser(payload)
    users.value = [created, ...users.value].sort((a, b) => a.username.localeCompare(b.username))
    toast('User created')
  } catch (err) {
    if (isAxiosError<{ message?: string }>(err)) {
      error.value = err.response?.data?.message ?? 'Failed to create user'
    } else {
      error.value = 'Failed to create user'
    }
  }
}

/* Delete */
const deleteOpen = ref(false)
const pendingDelete = ref<Px75User | null>(null)
const deleting = ref(false)
const deleteError = ref('')

function askDelete(u: Px75User) {
  if (!canManageUsers.value) return
  deleteError.value = ''
  pendingDelete.value = u
  deleteOpen.value = true
}

async function handleDelete() {
  if (!pendingDelete.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await apiDeleteUser(pendingDelete.value.id)
    users.value = users.value.filter((x) => x.id !== pendingDelete.value!.id)
    toast('User deleted')
    deleteOpen.value = false
  } catch (err) {
    if (isAxiosError<{ message?: string }>(err)) {
      deleteError.value = err?.response?.data?.message ?? 'Failed to delete user.'
    } else {
      error.value = 'Failed to delete user'
    }
  } finally {
    deleting.value = false
  }
}
</script>
