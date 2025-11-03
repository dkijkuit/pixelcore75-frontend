<template>
  <div ref="tableSlot">
    <v-data-table-virtual
      :headers="headers"
      :items="panels"
      item-key="panelId"
      class="elevation-1"
      fixed-header
      hover
      density="comfortable"
      :height="height"
      @click:row="onRow"
      :item-props="() => ({ style: 'cursor: pointer' })"
    >
      <!-- Client MAC with copy -->
      <template #[`item.clientMac`]="{ item }">
        <div class="d-flex align-center">
          <code>{{ item.clientMac }}</code>
          <v-btn
            icon="mdi-content-copy"
            size="x-small"
            variant="text"
            @click.stop="copy(item.clientMac)"
          />
        </div>
      </template>

      <!-- Serial with copy -->
      <template #[`item.serial`]="{ item }">
        <div class="d-flex align-center">
          <code>{{ item.serial }}</code>
          <v-btn
            icon="mdi-content-copy"
            size="x-small"
            variant="text"
            @click.stop="copy(item.serial)"
          />
        </div>
      </template>

      <!-- Panel Type chip -->
      <template #[`item.panelType`]="{ item }">
        <v-chip size="x-small" color="primary" variant="tonal">
          {{ item.panelType }}
        </v-chip>
      </template>

      <!-- Screens count -->
      <template #[`item.screens`]="{ item }">
        <span>{{ getScreenCount(item) }}</span>
      </template>

      <!-- Screen types -->
      <template #[`item.screenTypes`]="{ item }">
        <div class="d-flex gap-2 flex-wrap">
          <v-chip
            v-for="(t, i) in getScreenTypesUnique(item)"
            :key="i"
            size="x-small"
            variant="tonal"
          >
            {{ t }}
          </v-chip>
        </div>
      </template>

      <!-- Config details summary -->
      <template #[`item.configDetails`]="{ item }">
        <div v-if="item.config && item.config.screensConfig?.length" class="text-body-2">
          <div v-for="(s, i) in item.config.screensConfig.slice(0, 2)" :key="i" class="mb-1">
            <strong>{{ s.screenType }}</strong>
            <span v-if="s.screenType === 'IMAGE' && s.image"> — {{ s.image }}</span>
            <span v-else-if="s.screenType === 'CRYPTO_TICKER' && s.config">
              — {{ s.config.symbol }}/{{ s.config.currency }}
            </span>
            <span v-else-if="s.screenType === 'WEATHER_FORECAST' && s.latLon">
              — {{ s.latLon.lat }}, {{ s.latLon.lon }}
            </span>
            <span> ({{ s.durationSeconds }}s)</span>
          </div>
          <div
            v-if="item.config.screensConfig.length > 2"
            class="text-caption text-medium-emphasis"
          >
            +{{ item.config.screensConfig.length - 2 }} more…
          </div>
        </div>
        <div v-else class="text-medium-emphasis">—</div>
      </template>

      <!-- Config status -->
      <template #[`item.configStatus`]="{ item }">
        <v-chip v-if="isConfigured(item)" color="success" size="small" variant="flat">
          Configured
        </v-chip>
        <v-chip v-else color="grey" size="small" variant="flat"> Empty </v-chip>
      </template>

      <!-- Actions -->
      <template #[`item.actions`]="{ item }">
        <div class="d-flex justify-end" @click.stop>
          <v-tooltip text="Delete panel">
            <template #activator="{ props }">
              <v-btn v-bind="props" icon variant="text" color="error" @click.stop="emit('delete', item)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
        </div>
      </template>
    </v-data-table-virtual>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import type { DataTableHeader } from 'vuetify'
import type { Px75Panel } from '@/service/panels'
import {
  getRowItem,
  getScreenCount,
  getScreenTypesUnique,
  isConfigured,
  type RowLike,
} from '@/utils/panels'

const emit = defineEmits<{
  (e: 'rowClick', panel: Px75Panel): void
}>()

defineProps<{
  panels: Px75Panel[]
  height: number
}>()

const headers: DataTableHeader[] = [
  { title: 'Panel ID', value: 'panelId', width: 100 },
  { title: 'User', value: 'username', width: 100 },
  { title: 'Client MAC', value: 'clientMac' },
  { title: 'Serial', value: 'serial', width: 245 },
  { title: 'Name', value: 'name' },
  { title: 'Type', value: 'panelType', width: 140 },
  { title: 'Screens', value: 'screens', width: 100, sortable: false },
  { title: 'Screen Types', value: 'screenTypes', sortable: false },
  { title: 'Details', value: 'configDetails', sortable: false, width: 300 },
  { title: 'Config', value: 'configStatus', sortable: false, width: 120 },
  { title: '', value: 'actions', width: 72, align: 'end', sortable: false },
]

const tableSlot = ref<HTMLElement | null>(null)

function onRow(_event: MouseEvent, row: RowLike<Px75Panel>) {
  emit('rowClick', getRowItem(row))
}

function copy(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}
</script>
