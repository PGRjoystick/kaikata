<script setup lang="ts">
import { computed, ref } from 'vue'
import { allEntries } from '../lib/content'
import { speak } from '../lib/fx'
import { locale, t } from '../lib/i18n'
import { exportData, importData, resetAll, state, stats, week } from '../lib/store'

const version = __APP_VERSION__
const peak = computed(() => Math.max(1, ...week.value.map((d) => d.n)))
const weekTotal = computed(() => week.value.reduce((n, d) => n + d.n, 0))
const weekday = (ms: number) => new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(ms)
const since = computed(() => new Intl.DateTimeFormat(locale.value, { month: 'short', year: 'numeric' }).format(stats.value.since))
const notice = ref('')
const picker = ref<HTMLInputElement>()

const themes = ['auto', 'light', 'dark'] as const
const langs = [['auto', ''], ['en', 'English'], ['id', 'Indonesia']] as const

function download() {
  const url = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `kaikata-backup-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function restore(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  notice.value = importData(await file.text()) ? t('profile.importOk') : t('profile.importBad')
  if (picker.value) picker.value.value = ''
}

function reset() {
  if (window.confirm(t('profile.resetConfirm'))) resetAll()
}
</script>

<template>
  <main class="page">
    <header class="top"><h1 class="page-title">{{ t('profile.title') }}</h1></header>

    <section class="hero">
      <div class="hero-head">
        <span class="eyebrow">{{ t('profile.week') }}</span>
        <span class="muted">{{ weekTotal ? t('profile.cards', { n: weekTotal }) : t('profile.noCards') }}</span>
      </div>
      <div class="bars">
        <div v-for="(day, i) in week" :key="day.at" class="bar-col" :class="{ today: i === 6 }">
          <span class="bar-track"><i :style="{ height: `${(day.n / peak) * 100}%` }" /></span>
          <span class="bar-label">{{ weekday(day.at) }}</span>
        </div>
      </div>
    </section>

    <h3 class="section">{{ t('profile.allTime') }}</h3>
    <dl class="facts card">
      <div><dt>{{ t('profile.reviews') }}</dt><dd>{{ stats.reviews }}</dd></div>
      <div><dt>{{ t('profile.studyDays') }}</dt><dd>{{ stats.studyDays }}</dd></div>
      <div><dt>{{ t('profile.best') }}</dt><dd>{{ t('profile.days', { n: stats.best }) }}</dd></div>
      <div><dt>{{ t('profile.learned') }}</dt><dd>{{ stats.learned }} / {{ allEntries.length }}</dd></div>
      <div><dt>{{ t('profile.since') }}</dt><dd>{{ since }}</dd></div>
    </dl>

    <h3 class="section">{{ t('profile.settings') }}</h3>
    <div class="card">
      <div class="field">
        <span>{{ t('profile.theme') }}</span>
        <div class="seg">
          <button v-for="theme in themes" :key="theme" type="button" :class="{ on: state.settings.theme === theme }" @click="state.settings.theme = theme">{{ t(`profile.${theme}`) }}</button>
        </div>
      </div>
      <div class="field">
        <span>{{ t('profile.language') }}</span>
        <div class="seg">
          <button v-for="[code, label] in langs" :key="code" type="button" :class="{ on: state.settings.lang === code }" @click="state.settings.lang = code">{{ label || t('profile.auto') }}</button>
        </div>
      </div>
      <div class="field">
        <span>{{ t('profile.speech') }}</span>
        <div class="seg">
          <button type="button" :class="{ on: state.settings.speech === 'normal' }" @click="state.settings.speech = 'normal'; speak('こんにちは')">{{ t('profile.speechNormal') }}</button>
          <button type="button" :class="{ on: state.settings.speech === 'slow' }" @click="state.settings.speech = 'slow'; speak('こんにちは')">{{ t('profile.speechSlow') }}</button>
        </div>
      </div>
      <div class="field">
        <span>{{ t('profile.sound') }}</span>
        <div class="seg">
          <button type="button" :class="{ on: state.settings.sound }" @click="state.settings.sound = true">{{ t('profile.on') }}</button>
          <button type="button" :class="{ on: !state.settings.sound }" @click="state.settings.sound = false">{{ t('profile.off') }}</button>
        </div>
      </div>
    </div>

    <h3 class="section">{{ t('profile.data') }}</h3>
    <div class="card stack">
      <p class="muted small">{{ t('profile.dataHint') }}</p>
      <button class="btn quiet" type="button" @click="download">{{ t('profile.export') }}</button>
      <button class="btn quiet" type="button" @click="picker?.click()">{{ t('profile.import') }}</button>
      <input ref="picker" type="file" accept="application/json,.json" hidden @change="restore" />
      <button class="btn ghost danger" type="button" @click="reset">{{ t('profile.reset') }}</button>
      <p v-if="notice" class="small center" role="status">{{ notice }}</p>
    </div>

    <h3 class="section">{{ t('profile.about') }}</h3>
    <div class="card stack legal">
      <p class="small">Kaikata {{ version }}</p>
      <p class="muted small">
        {{ t('profile.creditStrokes') }}
        <a href="https://kanjivg.tagaini.net" target="_blank" rel="noopener">KanjiVG</a> © Ulrich Apel,
        <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC BY-SA 3.0</a>.
        {{ t('profile.creditKanji') }}
        <a href="https://www.edrdg.org/wiki/index.php/KANJIDIC_Project" target="_blank" rel="noopener">KANJIDIC2</a>,
        {{ t('profile.creditEdrdg') }}
        <a href="https://www.edrdg.org/" target="_blank" rel="noopener">Electronic Dictionary Research and Development Group</a>,
        <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>.
        {{ t('profile.creditModified') }}
      </p>
      <RouterLink class="btn quiet" to="/licenses">{{ t('licenses.title') }}</RouterLink>
    </div>
  </main>
</template>

<style scoped>
.legal p { line-height: 1.55; overflow-wrap: anywhere; }
.legal p a { color: var(--indigo); text-decoration: underline; text-underline-offset: 2px; }
</style>
