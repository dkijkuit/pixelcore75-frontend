<template>
  <v-app class="h-screen"> <!-- or style="height: 100dvh" -->
    <v-layout class="rounded rounded-md border">
      <v-app-bar color="surface">
        <v-img
          src="/favicon.svg"
          alt="Pixelcore75 Logo"
          max-width="32"
          max-height="32"
          class="ml-3 mr-4"
          contain
        />
        <span class="text-h6 font-weight-medium">{{ appName }}</span>
      </v-app-bar>

      <v-navigation-drawer expand-on-hover permanent rail v-if="user" color="surface">
        <v-list>
          <v-list-item prepend-icon="mdi-account" :subtitle="user.email" :title="user.username" :to="{ name: 'dashboard-user-details', params: { id: user.id } }"/>
        </v-list>

        <v-divider />

        <v-list density="compact" nav>
          <v-list-item prepend-icon="mdi-home" title="Home" :to="{ name: 'dashboard-home' }" exact />
          <v-list-item prepend-icon="mdi-account-multiple" title="Users" :to="{ name: 'dashboard-users' }" exact v-if="user.roles.includes('ADMIN')" />
          <v-list-item prepend-icon="mdi-view-grid" title="Panels" :to="{ name: 'dashboard-panels' }" />
        </v-list>

        <template #append>
          <v-list>
            <v-list-item
              link
              @click="toggleTheme"
              :title="isDark ? 'Light Mode' : 'Dark Mode'"
              :prepend-icon="isDark ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent'"
            />
            <v-list-item prepend-icon="mdi-logout" title="Logout" to="/logout" />
          </v-list>
        </template>
      </v-navigation-drawer>

      <!-- Make v-main the scroll container -->
      <v-main class="bg-background overflow-auto">
        <v-container fluid class="pa-4">
          <router-view />
        </v-container>
      </v-main>
    </v-layout>
  </v-app>
</template>


<script lang="ts" setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/AuthStore'
import { useTheme } from 'vuetify'

const appName = import.meta.env.VITE_APP_NAME
const auth = useAuthStore()
const user = computed(() => auth.user)
const theme = useTheme()
const isDark = computed(() => theme.global.current.value.dark)

function toggleTheme() {
  theme.change(isDark.value ? 'light' : 'dark')
  localStorage.setItem('theme', theme.global.name.value)
}
</script>
