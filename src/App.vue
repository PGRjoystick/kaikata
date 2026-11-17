<script setup lang="ts">
import { watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import BottomNav from './components/BottomNav.vue'
import { lang } from './lib/i18n'
import { state } from './lib/store'

const route = useRoute()

watchEffect(() => {
  const root = document.documentElement
  if (state.settings.theme === 'auto') delete root.dataset.theme
  else root.dataset.theme = state.settings.theme
  root.lang = lang.value
})
</script>

<template>
  <RouterView :key="route.fullPath" />
  <BottomNav v-if="route.meta.nav" />
</template>
