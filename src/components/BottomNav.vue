<script setup lang="ts">
import { dueCards } from '../lib/store'
import { t } from '../lib/i18n'
</script>

<template>
  <nav class="nav">
    <RouterLink to="/" class="nav-item">
      <span class="nav-pill"><svg viewBox="0 0 24 24"><path class="line" d="M4 19.500V6a2 2 0 0 1 2-2h13v14H6.500A2.5 2.5 0 0 0 4 20.500zM19 18v3H6.5" /></svg></span>
      <span>{{ t('nav.home') }}</span>
    </RouterLink>
    <RouterLink to="/review" class="nav-item">
      <span class="nav-pill">
        <svg viewBox="0 0 24 24"><path class="line" d="M4 12a8 8 0 1 0 2.5-5.800M4 4v4.500h4.5" /></svg>
        <b v-if="dueCards.length" class="badge">{{ dueCards.length > 99 ? '99+' : dueCards.length }}</b>
      </span>
      <span>{{ t('nav.review') }}</span>
    </RouterLink>
    <RouterLink to="/words" class="nav-item">
      <span class="nav-pill"><svg viewBox="0 0 24 24"><path class="line" d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg></span>
      <span>{{ t('nav.words') }}</span>
    </RouterLink>
    <RouterLink to="/profile" class="nav-item">
      <span class="nav-pill"><svg viewBox="0 0 24 24"><circle class="line" cx="12" cy="8.5" r="3.5" /><path class="line" d="M5 20a7 7 0 0 1 14 0" /></svg></span>
      <span>{{ t('nav.profile') }}</span>
    </RouterLink>
  </nav>
</template>
