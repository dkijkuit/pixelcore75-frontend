<template>
  <div ref="tableSlot">
    <v-data-table-virtual
      :headers="computedHeaders"
      :items="users"
      item-key="id"
      fixed-header
      :height="height"
      hover
      @click:row="onRow"
      :item-props="() => ({ style: 'cursor: pointer' })"
    >
      <template #[`item.roles`]="{ item }">
        <div class="d-flex flex-wrap ga-1 py-1">
          <v-chip
            v-for="r in item.roles"
            :key="`${item.id}-${r}`"
            size="small"
            label
            variant="tonal"
            :color="r === 'ADMIN' ? 'primary' : undefined"
          >
            {{ toLabel(r) }}
          </v-chip>
        </div>
      </template>

      <template v-if="canManageUsers" #[`item.actions`]="{ item }">
        <div class="d-flex justify-end" @click.stop>
          <v-tooltip text="Delete user">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                icon
                variant="text"
                color="error"
                @click.stop="emit('delete', item)"
              >
                <v-icon>mdi-delete-outline</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
        </div>
      </template>
    </v-data-table-virtual>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { User } from '@/types/users'
import { toLabel } from '@/utils/roles'
import { getRowItem, type RowLike } from '@/utils/panels'

const props = defineProps<{
  users: User[]
  canManageUsers: boolean
  height: number
}>()

const emit = defineEmits<{
  (e: 'rowClick', user: User): void
  (e: 'delete', user: User): void
}>()

const baseHeaders = [
  { title: 'ID', value: 'id', width: 80 },
  { title: 'Username', value: 'username' },
  { title: 'Email', value: 'email' },
  { title: 'Roles', value: 'roles' },
]
const actionsCol = { title: '', value: 'actions', width: 80, align: 'end', sortable: false }
const computedHeaders = computed(() =>
  props.canManageUsers ? [...baseHeaders, actionsCol] : baseHeaders,
)

const tableSlot = ref<HTMLElement | null>(null)

function onRow(_event: MouseEvent, row: RowLike<User>) {
  emit('rowClick', getRowItem(row))
}
</script>
