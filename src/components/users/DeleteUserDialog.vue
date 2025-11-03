<template>
  <v-dialog v-model="model" max-width="520">
    <v-card>
      <v-card-title>Delete user?</v-card-title>
      <v-card-text>
        This action cannot be undone.
        <div v-if="user" class="mt-2">
          User: <strong>{{ user.username }}</strong>
          <div class="text-caption">{{ user.email }}</div>
        </div>
        <v-alert v-if="error" type="error" class="mt-3">{{ error }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="error" :loading="loading" @click="$emit('confirm')">
          <v-icon start>mdi-delete</v-icon>Delete
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import type { User } from '@/types/users'

const props = defineProps<{
  modelValue: boolean
  user: User | null
  loading?: boolean
  error?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'confirm'): void
}>()

const model = ref(props.modelValue)
watch(() => props.modelValue, v => (model.value = v))
watch(model, v => emit('update:modelValue', v))

function close() {
  model.value = false
}
</script>
