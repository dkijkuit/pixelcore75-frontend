<script setup lang="ts">
import { ref, onMounted } from "vue";
import { fetchCompetitionIds } from "@/service/metadata";
import type { AnyScreen } from '@/registry/screensRegistry.ts';

type T = Extract<AnyScreen, { screenType: 'SOCCER_MATCH' }>;
const props = defineProps<{ modelValue: T }>();
const emit = defineEmits<{ 'update:modelValue': [T] }>();
function update(patch: Partial<T>) {
  emit('update:modelValue', { ...props.modelValue, ...patch });
}

const competitionIds = ref<string[]>([]);
const loadingCompetitions = ref(false);
const competitionsError = ref<string | null>(null);

onMounted(async () => {
  loadingCompetitions.value = true;
  competitionsError.value = null;
  try {
    competitionIds.value = await fetchCompetitionIds({ /* search, limit */ });
  } catch (e: any) {
    competitionsError.value = e?.message ?? "Failed to load competitions";
  } finally {
    loadingCompetitions.value = false;
  }
});
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
      return-object="false"
      @update:model-value="v => update({ competitionId: (v || '').trim() })"
    />

    <v-text-field
      type="text"
      label="Team id"
      :model-value="modelValue.teamId"
      class="flex-grow-1"
      required
      @update:model-value="v => update({ teamId: (v || '').trim() })"
    />
  </div>
</template>
