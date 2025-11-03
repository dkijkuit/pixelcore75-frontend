<template>
  <AuthLayout>
    <div class="d-flex flex-column align-center text-center mb-4">
      <v-img
        src="/favicon.svg"
        alt="Pixelcore75 Logo"
        width="72"
        height="72"
        class="mb-2"
        contain
      />
      <div class="text-h6 font-weight-medium">{{ appName }}</div>
      <div class="text-body-2 text-medium-emphasis">Sign in to your account</div>
    </div>

    <v-form
      v-model="isValid"
      @submit.prevent="handleLogin"
      class="d-flex flex-column ga-4"
    >
      <v-text-field
        v-model="username"
        label="Username"
        prepend-inner-icon="mdi-account"
        variant="outlined"
        density="comfortable"
        :rules="[rules.required]"
      />

      <v-text-field
        v-model="password"
        label="Password"
        type="password"
        prepend-inner-icon="mdi-lock"
        variant="outlined"
        density="comfortable"
        :rules="[rules.required]"
      />

      <v-alert v-if="error" type="error" density="comfortable">
        {{ error }}
      </v-alert>

      <v-btn
        type="submit"
        color="primary"
        size="large"
        :loading="loading"
        :disabled="!isValid || loading"
        block
      >
        Login
      </v-btn>
    </v-form>
  </AuthLayout>
</template>



<script lang="ts" setup>
import { ref } from 'vue'
import api from '@/service/api'
import { useAuthStore } from '@/stores/AuthStore'
import { useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'

const appName = import.meta.env.VITE_APP_NAME
const auth = useAuthStore()
const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const isValid = ref(false)

const rules = {
  required: (v: string) => !!v || 'Field is required',
}

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    // if username/password are refs, use .value
    const res = await api.post('/auth/login', {
      username: username.value ?? username,
      password: password.value ?? password,
    })
    const { accessToken, px75User } = res.data // backend also sets refresh cookie
    auth.setSession(accessToken, px75User) // store token in memory + user (optional persist)
    router.push('/dashboard')
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Invalid username or password'
  } finally {
    loading.value = false
  }
}
</script>
