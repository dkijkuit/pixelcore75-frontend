<script setup lang="ts">
import { ref } from 'vue'
import type { AnyScreen } from '@/registry/screensRegistry.ts'

type T = Extract<AnyScreen, { screenType: 'IMAGE' }>

const props = defineProps<{ modelValue: T }>()
const emit = defineEmits<{ 'update:modelValue': [T] }>()

function update(patch: Partial<T>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

const fileModel = ref<File | null>(null)
const resetKey = ref(0)

function toUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function onFileChange(v: File | File[] | null) {
  const file = Array.isArray(v) ? v[0] : v
  if (!file) return

  const url = await toUrl(file)

  // Validate dimensions
  const isValid = await new Promise<boolean>((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve(img.width === 64 && img.height === 32)
    }
    img.onerror = () => resolve(false)
    img.src = url
  })

  if (!isValid) {
    alert('Image must be exactly 64x32 pixels.')
    fileModel.value = null
    return
  }

  update({
    image: file.name,
    imageUploadData: url,
  })
}


function clearImage() {
  update({
    image: '',
    imageUploadData: '',
  })
  fileModel.value = null
  resetKey.value++
}
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <!-- Image file upload -->
    <v-file-input
      :key="resetKey"
      v-model="fileModel"
      label="Upload image"
      accept="image/*"
      prepend-icon="mdi-image"
      show-size
      counter
      @update:model-value="onFileChange"
      hint="Upload an image file."
      persistent-hint
    />

    <!-- Live preview -->
    <div v-if="modelValue.imageUploadData" class="d-flex flex-column ga-2">
      <div class="text-subtitle-2">Preview ({{ modelValue.image }})</div>
      <v-img
        :src="modelValue.imageUploadData"
        max-height="240"
        cover
        class="rounded"
      />
      <div class="d-flex ga-2">
        <v-btn size="small" variant="text" color="error" @click="clearImage">
          Clear
        </v-btn>
      </div>
    </div>
  </div>
</template>
