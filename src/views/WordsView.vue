<script setup lang="ts">
import { computed, ref } from 'vue'
import EntrySheet from '../components/EntrySheet.vue'
import { allEntries, decks } from '../lib/content'
import { t, tk } from '../lib/i18n'
import { meaningOf } from '../lib/session'
import { isLearned } from '../lib/store'

const query = ref('')
const status = ref<'all' | 'learned' | 'new'>('all')
const deckId = ref('all')
const open = ref<string | null>(null)
const statuses = ['all', 'learned', 'new'] as const

const list = computed(() => {
  const q = query.value.trim().toLowerCase()
  return allEntries.filter((e) => {
    if (deckId.value !== 'all' && e.deckId !== deckId.value) return false
    if (status.value !== 'all' && isLearned(e.id) !== (status.value === 'learned')) return false
    return !q || e.text.includes(q) || e.reading.toLowerCase().includes(q) || meaningOf(e).toLowerCase().includes(q)
  })
})
const shown = computed(() => list.value.slice(0, 150))
</script>

<template>
  <main class="page">
    <header class="top"><h1 class="page-title">{{ t('words.title') }}</h1></header>

    <input v-model="query" class="search" type="search" :placeholder="t('words.search')" autocomplete="off" />
    <div class="filters">
      <div class="seg">
        <button v-for="s in statuses" :key="s" type="button" :class="{ on: status === s }" @click="status = s">{{ t(`words.${s}`) }}</button>
      </div>
      <select v-model="deckId" class="select" :aria-label="t('words.allDecks')">
        <option value="all">{{ t('words.allDecks') }}</option>
        <option v-for="d in decks" :key="d.id" :value="d.id">{{ tk(`deck.${d.id}.name`) }}</option>
      </select>
    </div>

    <ul class="rows">
      <li v-for="entry in shown" :key="entry.id">
        <button class="row" type="button" @click="open = entry.id">
          <span class="mark" :class="{ on: isLearned(entry.id) }">
            <svg v-if="isLearned(entry.id)" viewBox="0 0 24 24"><path class="line" d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </span>
          <span class="row-text">
            <b class="jp" lang="ja">{{ entry.text }}</b>
            <small>{{ entry.reading }}<template v-if="meaningOf(entry)"> · {{ meaningOf(entry) }}</template></small>
          </span>
          <span class="row-end">{{ tk(`kind.${entry.kind}`) }}</span>
        </button>
      </li>
    </ul>
    <p v-if="!list.length" class="muted center">{{ t('words.none') }}</p>
    <p v-else-if="list.length > shown.length" class="muted center small">{{ shown.length }} / {{ list.length }}</p>

    <EntrySheet v-if="open" :entry-id="open" @close="open = null" />
  </main>
</template>
