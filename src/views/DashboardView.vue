<template>
  <v-layout class="h-screen">
    <v-app-bar flat border="b" color="surface">
      <v-img
        src="/favicon.svg"
        alt="Pixelcore75 Logo"
        max-width="28"
        max-height="28"
        class="ml-4 mr-3"
        contain
      />
      <span class="text-h6 font-weight-medium">{{ appName }}</span>

      <v-spacer />

      <v-btn
        :icon="isDark ? 'mdi-white-balance-sunny' : 'mdi-weather-night'"
        variant="text"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="toggleTheme"
      />

      <v-menu v-if="user" location="bottom end" offset="8">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="text" class="ml-1 pr-2">
            <v-avatar size="28" color="primary" class="mr-2">
              <span class="text-body-2 font-weight-medium">{{ initials }}</span>
            </v-avatar>
            <span class="text-body-2">{{ user.username }}</span>
            <v-icon size="small" class="ml-1">mdi-chevron-down</v-icon>
          </v-btn>
        </template>
        <v-list density="compact" nav rounded="lg" class="py-1">
          <v-list-item
            prepend-icon="mdi-account-outline"
            title="My profile"
            :to="{ name: 'dashboard-user-details', params: { id: user.id } }"
          />
          <v-divider class="my-1" />
          <v-list-item prepend-icon="mdi-logout" title="Sign out" to="/logout" />
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-navigation-drawer v-if="user" expand-on-hover permanent rail color="surface" border="e">
      <v-list density="compact" nav class="py-2">
        <v-list-item
          prepend-icon="mdi-home-outline"
          title="Home"
          :to="{ name: 'dashboard-home' }"
          exact
        />
        <v-list-item
          v-if="user.roles.includes('ADMIN')"
          prepend-icon="mdi-account-multiple-outline"
          title="Users"
          :to="{ name: 'dashboard-users' }"
          exact
        />
        <v-list-item
          prepend-icon="mdi-view-grid-outline"
          title="Panels"
          :to="{ name: 'dashboard-panels' }"
        />
      </v-list>
    </v-navigation-drawer>

    <!-- Make v-main the scroll container -->
    <v-main class="bg-background overflow-auto">
      <v-container fluid class="pa-6 page-container">
        <router-view />
      </v-container>
    </v-main>
  </v-layout>
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

const initials = computed(() => (user.value?.username ?? '?').slice(0, 1).toUpperCase())

function toggleTheme() {
  theme.change(isDark.value ? 'light' : 'dark')
  localStorage.setItem('theme', theme.global.name.value)
}
</script>

<style scoped>
.page-container {
  max-width: 1440px;
  margin: 0 auto;
}
</style>
