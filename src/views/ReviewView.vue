<script setup lang="ts">
import { computed } from 'vue'
import { locale, t } from '../lib/i18n'
import { dueCards, forecast, missedCards, recentCards, state, weakCards } from '../lib/store'

const peak = computed(() => Math.max(1, ...forecast.value.map((d) => d.count)))
const weekday = (ms: number) => new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(ms)

const sets = computed(() => [
  { id: 'misses', title: t('review.misses'), hint: t('review.missesHint'), count: missedCards.value.length, icon: 'M4 12a8 8 0 1 0 2.5-5.8M4 4v4.5h4.5' },
  { id: 'recent', title: t('review.recent'), hint: t('review.recentHint'), count: recentCards.value.length, icon: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z' },
  { id: 'weak', title: t('review.weak'), hint: t('review.weakHint'), count: weakCards.value.length, icon: 'M3 7l6 6 4-4 8 8M21 11v6h-6' },
])
const types = ['both', 'writing', 'reading'] as const
const sizes = [10, 20, 40]
</script>

<template>
  <main class="page">
    <header class="top"><h1 class="page-title">{{ t('review.title') }}</h1></header>

    <section class="hero">
      <h2 class="hero-count">{{ dueCards.length ? t('review.due', { n: dueCards.length }) : t('review.none') }}</h2>
      <p v-if="!dueCards.length" class="muted">{{ t('review.noneHint') }}</p>
      <div class="bars">
        <div v-for="(day, i) in forecast" :key="day.at" class="bar-col" :class="{ today: i === 0 }">
          <span class="bar-track"><i :style="{ height: `${(day.count / peak) * 100}%` }" /></span>
          <span class="bar-label">{{ i === 0 ? t('review.today') : weekday(day.at) }}</span>
          <span class="bar-value">{{ day.count || '–' }}</span>
        </div>
      </div>
      <RouterLink v-if="dueCards.length" class="btn primary" to="/session/review/due">{{ t('review.start') }}</RouterLink>
    </section>

    <h3 class="section">{{ t('review.sets') }}</h3>
    <ul class="rows">
      <li v-for="set in sets" :key="set.id">
        <component :is="set.count ? 'RouterLink' : 'div'" class="row" :class="{ empty: !set.count }" :to="`/session/review/${set.id}`">
          <span class="row-icon"><svg viewBox="0 0 24 24"><path class="line" :d="set.icon" /></svg></span>
          <span class="row-text"><b>{{ set.title }}</b><small>{{ set.hint }}</small></span>
          <span class="row-end">{{ set.count ? t('review.cards', { n: set.count }) : t('review.empty') }}</span>
        </component>
      </li>
    </ul>

    <h3 class="section">{{ t('review.options') }}</h3>
    <div class="card">
      <div class="field">
        <span>{{ t('review.types') }}</span>
        <div class="seg">
          <button v-for="type in types" :key="type" type="button" :class="{ on: state.settings.reviewTypes === type }" @click="state.settings.reviewTypes = type">
            {{ t(`review.${type}`) }}
          </button>
        </div>
      </div>
      <div class="field">
        <span>{{ t('review.size') }}</span>
        <div class="seg">
          <button v-for="size in sizes" :key="size" type="button" :class="{ on: state.settings.sessionSize === size }" @click="state.settings.sessionSize = size">{{ size }}</button>
        </div>
      </div>
    </div>
  </main>
</template>
