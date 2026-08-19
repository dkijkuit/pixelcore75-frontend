<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { fetchCompetitionIds, fetchSoccerTeams, type SoccerTeam } from '@/service/metadata'
import type { AnyScreen } from '@/registry/screensRegistry.ts'

type T = Extract<AnyScreen, { screenType: 'SOCCER_MATCH' }>
const props = defineProps<{ modelValue: T }>()
const emit = defineEmits<{ 'update:modelValue': [T] }>()
function update(patch: Partial<T>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

const competitionIds = ref<string[]>([])
const loadingCompetitions = ref(false)
const competitionsError = ref<string | null>(null)

onMounted(async () => {
  loadingCompetitions.value = true
  competitionsError.value = null
  try {
    competitionIds.value = await fetchCompetitionIds({
      /* search, limit */
    })
  } catch (e) {
    competitionsError.value = e instanceof Error ? e.message : 'Failed to load competitions'
  } finally {
    loadingCompetitions.value = false
  }
})

const teams = ref<SoccerTeam[]>([])
const loadingTeams = ref(false)
const teamsError = ref<string | null>(null)
let teamsRequestId = 0

watch(
  () => props.modelValue.competitionId,
  async (competitionId) => {
    const request = ++teamsRequestId
    teams.value = []
    teamsError.value = null

    if (!competitionId) return

    loadingTeams.value = true
    try {
      const result = await fetchSoccerTeams(competitionId)
      if (request !== teamsRequestId) return
      teams.value = result

      // Drop a team id that does not belong to the selected competition
      const currentTeamId = props.modelValue.teamId
      if (currentTeamId && !result.some((team) => team.id === currentTeamId)) {
        update({ teamId: '' })
      }
    } catch (e) {
      if (request !== teamsRequestId) return
      teamsError.value = e instanceof Error ? e.message : 'Failed to load teams'
    } finally {
      if (request === teamsRequestId) loadingTeams.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="d-flex ga-2">
    <!-- Use v-autocomplete (type-ahead) or v-select (strict select only) -->
    <v-autocomplete
      label="Competition id"
      :items="competitionIds"
      :model-value="modelValue.competitionId"
      class="flex-grow-1"
      clearable
      hide-details="auto"
      :loading="loadingCompetitions"
      :error="!!competitionsError"
      :error-messages="competitionsError ?? ''"
      @update:model-value="(v) => update({ competitionId: (v || '').trim() })"
    />

    <v-autocomplete
      label="Team"
      :items="teams"
      item-title="name"
      item-value="id"
      :model-value="modelValue.teamId"
      class="flex-grow-1"
      clearable
      hide-details="auto"
      :loading="loadingTeams"
      :disabled="!modelValue.competitionId"
      :error="!!teamsError"
      :error-messages="teamsError ?? ''"
      @update:model-value="(v) => update({ teamId: (v || '').trim() })"
    />
  </div>
</template>
