<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EntrySheet from '../components/EntrySheet.vue'
import { entries, lessons } from '../lib/content'
import { t, tk } from '../lib/i18n'
import { meaningOf, newEntriesOf } from '../lib/session'
import { isLearned, state } from '../lib/store'

const route = useRoute()
const router = useRouter()
const lesson = computed(() => lessons[String(route.params.id)])
const fresh = computed(() => (lesson.value ? newEntriesOf(lesson.value.id).length : 0))
const open = ref<string | null>(null)

if (!lesson.value) void router.replace('/')
</script>

<template>
  <main v-if="lesson" class="page">
    <header class="bar">
      <button class="icon-btn" type="button" aria-label="Back" @click="router.push('/')">
        <svg viewBox="0 0 24 24"><path class="line" d="M15 5l-7 7 7 7" /></svg>
      </button>
      <div class="bar-title">
        <p class="eyebrow">{{ tk(`deck.${lesson.deckId}.name`) }}</p>
        <h1>{{ t('home.lesson', { n: lesson.number }) }}</h1>
      </div>
      <span class="stars big">
        <svg v-for="n in 3" :key="n" viewBox="0 0 24 24" :class="{ on: n <= (state.stars[lesson.id] ?? 0) }"><path d="M12 3.500l2.6 5.4 5.9.8-4.3 4.1 1 5.900L12 17l-5.2 2.7 1-5.900L3.5 9.700l5.9-.8z" /></svg>
      </span>
    </header>

    <ul class="tiles" :class="{ wide: entries[lesson.entryIds[0]].text.length > 1 }">
      <li v-for="id in lesson.entryIds" :key="id">
        <button class="tile" :class="{ learned: isLearned(id) }" type="button" @click="open = id">
          <span class="tile-text jp" lang="ja">{{ entries[id].text }}</span>
          <span class="tile-sub">{{ meaningOf(entries[id]) || entries[id].reading }}</span>
          <svg v-if="isLearned(id)" class="tile-check" viewBox="0 0 24 24"><path class="line" d="M5 12.500l4.5 4.500L19 7.5" /></svg>
        </button>
      </li>
    </ul>

    <div class="stack">
      <RouterLink class="btn" :class="fresh ? 'primary' : 'quiet'" :to="`/session/learn/${lesson.id}`">
        {{ fresh ? t('lesson.learn', { n: fresh }) : t('lesson.relearn') }}
      </RouterLink>
      <RouterLink class="btn quiet" :to="`/session/practice/${lesson.id}`">{{ t('lesson.practice') }}</RouterLink>
      <RouterLink class="btn" :class="fresh ? 'quiet' : 'primary'" :to="`/session/test/${lesson.id}`">{{ t('lesson.test') }}</RouterLink>
      <p class="muted small center">{{ t('lesson.testHint') }}</p>
    </div>

    <EntrySheet v-if="open" :entry-id="open" @close="open = null" />
  </main>
</template>
