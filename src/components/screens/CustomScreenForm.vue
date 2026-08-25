<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { AnyScreen } from '@/registry/screensRegistry.ts'
import { listCustomScreens, type CustomScreen } from '@/service/customScreens.ts'
import CustomForm from '@/components/screens/CustomForm.vue'

/**
 * Panel-dialog form for CUSTOM screens: pick one of the user's saved custom screens
 * (the library lives in the Custom Screens nav view). Legacy entries carrying an inline
 * design keep the original designer for in-place editing.
 */
type T = Extract<AnyScreen, { screenType: 'CUSTOM' }>
type InlineModel = { screenType: 'CUSTOM'; durationSeconds: number; design: string }

const props = defineProps<{ modelValue: T }>()
const emit = defineEmits<{ 'update:modelValue': [T] }>()

const screens = ref<CustomScreen[]>([])
const loading = ref(true)
const loadError = ref('')

const legacy = computed(() => typeof props.modelValue.design === 'string')
const legacyModel = computed<InlineModel>(() => ({
  screenType: 'CUSTOM',
  durationSeconds: props.modelValue.durationSeconds,
  design: props.modelValue.design ?? '',
}))

onMounted(async () => {
  try {
    screens.value = await listCustomScreens()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
})

const items = computed(() =>
  screens.value.map((s) => ({
    value: s.id,
    title: s.name + (s.owned ? '' : ` — ${s.ownerUsername}`),
    subtitle: `${s.durationSeconds}s${s.shared ? ' • shared' : ''}`,
    screen: s,
  })),
)

const selected = computed<number | undefined>(
  () =>
    (typeof props.modelValue.customScreenId === 'number'
      ? props.modelValue.customScreenId
      : undefined) ?? undefined,
)

function onSelect(id: number | null) {
  if (id == null) return
  const screen = screens.value.find((s) => s.id === id)
  if (!screen) return
  // Pre-fill the duration from the entry's default only when nothing is referenced yet
  // (first pick in the add flow); afterwards the dialog's duration field wins.
  const prefill = props.modelValue.customScreenId === undefined ? screen.durationSeconds : undefined
  emit('update:modelValue', {
    screenType: 'CUSTOM' as const,
    durationSeconds: prefill ?? props.modelValue.durationSeconds,
    disabled: props.modelValue.disabled,
    customScreenId: id,
  })
}

function onLegacyUpdate(next: InlineModel) {
  emit('update:modelValue', {
    screenType: 'CUSTOM',
    durationSeconds: next.durationSeconds,
    disabled: props.modelValue.disabled,
    design: next.design,
  })
}
</script>

<template>
  <div class="d-flex flex-column ga-3">
    <template v-if="legacy">
      <v-alert density="compact" type="info" variant="tonal">
        Legacy inline design (saved before the custom screen library existed). New screens reference
        a library entry instead — manage them under Custom Screens.
      </v-alert>
      <CustomForm :model-value="legacyModel" @update:model-value="onLegacyUpdate" />
    </template>

    <template v-else>
      <v-alert v-if="loadError" type="error" density="compact">{{ loadError }}</v-alert>
      <v-skeleton-loader v-else-if="loading" type="text@2" />

      <template v-else>
        <v-select
          v-if="screens.length"
          label="Custom screen"
          :items="items"
          item-title="title"
          item-subtitle="subtitle"
          item-value="value"
          :model-value="selected"
          hint="Shared screens show their owner's name. Edits in the library apply to every panel using the screen."
          persistent-hint
          @update:model-value="onSelect"
        />

        <v-alert v-else type="info" variant="tonal" density="compact">
          No custom screens yet — create one first.
        </v-alert>

        <router-link
          v-if="selected !== undefined || !screens.length"
          :to="{ name: 'dashboard-custom-screens' }"
          class="text-body-2"
        >
          <v-icon size="small" class="mr-1">mdi-open-in-new</v-icon>
          Manage custom screens
        </router-link>
      </template>
    </template>
  </div>
</template>
