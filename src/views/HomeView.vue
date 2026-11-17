<script setup lang="ts">
import { computed } from 'vue'
import { deckEntries, deckOf, decks, entries } from '../lib/content'
import { t, tk } from '../lib/i18n'
import { dueCards, isLearned, state, stats } from '../lib/store'

const deck = computed(() => deckOf(state.settings.deckId))
const all = computed(() => deckEntries(deck.value))
const learned = computed(() => all.value.filter((e) => isLearned(e.id)).length)
const stars = computed(() => deck.value.lessons.reduce((n, l) => n + (state.stars[l.id] ?? 0), 0))
const nextLesson = computed(() => deck.value.lessons.find((l) => l.entryIds.some((id) => !isLearned(id))))
const percent = computed(() => Math.round((learned.value / Math.max(1, all.value.length)) * 100))
</script>

<template>
  <main class="page">
    <header class="top">
      <div class="deck-tabs" role="tablist">
        <button
          v-for="d in decks"
          :key="d.id"
          class="deck-tab"
          :class="{ active: d.id === deck.id }"
          type="button"
          role="tab"
          :aria-selected="d.id === deck.id"
          @click="state.settings.deckId = d.id"
        >
          <span class="jp" lang="ja">{{ d.icon }}</span>
          {{ tk(`deck.${d.id}.name`) }}
        </button>
      </div>
    </header>

    <section class="hero">
      <div class="hero-row">
        <span class="hero-seal jp" lang="ja">{{ deck.icon }}</span>
        <div class="hero-text">
          <h1>{{ tk(`deck.${deck.id}.name`) }}</h1>
          <p>{{ tk(`deck.${deck.id}.about`) }}</p>
        </div>
        <div class="streak" :class="{ lit: stats.streak > 0 }" :title="t('home.streak')">
          <svg viewBox="0 0 24 24"><path d="M12 3c1 3.5 4.5 5 4.5 9.500a4.5 4.5 0 0 1-9 0c0-1.6.6-2.7 1.5-3.7.3 1.3 1 2 1.8 2.200C10.5 8 11 5.5 12 3z" /></svg>
          {{ stats.streak }}
        </div>
      </div>
      <div class="meter" role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100"><i :style="{ width: `${percent}%` }" /></div>
      <div class="hero-stats">
        <span><b>{{ learned }}</b> / {{ all.length }} {{ t('home.learned') }}</span>
        <span><b>{{ stars }}</b> / {{ deck.lessons.length * 3 }} {{ t('home.stars') }}</span>
      </div>
      <RouterLink v-if="nextLesson" class="btn primary" :to="`/lesson/${nextLesson.id}`">
        {{ t('home.continue', { lesson: t('home.lesson', { n: nextLesson.number }) }) }}
      </RouterLink>
      <p v-else class="hero-done">{{ t('home.allDone') }}</p>
      <RouterLink v-if="dueCards.length" class="btn quiet" to="/review">{{ t('home.reviewDue', { n: dueCards.length }) }}</RouterLink>
    </section>

    <ol class="lessons">
      <li v-for="lesson in deck.lessons" :key="lesson.id">
        <RouterLink class="lesson" :class="{ next: lesson.id === nextLesson?.id }" :to="`/lesson/${lesson.id}`">
          <div class="lesson-head">
            <h2>{{ t('home.lesson', { n: lesson.number }) }}</h2>
            <span class="stars" :aria-label="`${state.stars[lesson.id] ?? 0}/3`">
              <svg v-for="n in 3" :key="n" viewBox="0 0 24 24" :class="{ on: n <= (state.stars[lesson.id] ?? 0) }"><path d="M12 3.500l2.6 5.4 5.9.8-4.3 4.1 1 5.900L12 17l-5.2 2.7 1-5.900L3.5 9.700l5.9-.8z" /></svg>
            </span>
          </div>
          <p class="lesson-sub">{{ lesson.subtitle }}</p>
          <div class="chips">
            <span v-for="id in lesson.entryIds" :key="id" class="chip jp" :class="{ learned: isLearned(id), wide: entries[id].text.length > 1 }" lang="ja">{{ entries[id].text }}</span>
          </div>
        </RouterLink>
      </li>
    </ol>
  </main>
</template>
