<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { t } from '../lib/i18n'

interface Notice {
  name: string
  version: string
  license: string
  author?: string
  homepage?: string
  text: string
}
interface Notices {
  packages: Notice[]
  android: { libraries: { group: string; name: string; version: string }[]; license: string; text: string }
}

const router = useRouter()
const notices = ref<Notices | null>(null)
const failed = ref(false)

onMounted(async () => {
  try {
    const res = await fetch('./third-party-notices.json')
    if (!res.ok) throw new Error(String(res.status))
    notices.value = await res.json()
  } catch {
    failed.value = true // only produced by `npm run build`, so absent in dev
  }
})

const CC_BY_SA_3 = 'https://creativecommons.org/licenses/by-sa/3.0/'
const CC_BY_SA_4 = 'https://creativecommons.org/licenses/by-sa/4.0/'
</script>

<template>
  <main class="page">
    <header class="bar">
      <button class="icon-btn" type="button" aria-label="Back" @click="router.push('/profile')">
        <svg viewBox="0 0 24 24"><path class="line" d="M15 5l-7 7 7 7" /></svg>
      </button>
      <div class="bar-title"><h1>{{ t('licenses.title') }}</h1></div>
    </header>

    <h3 class="section">{{ t('licenses.data') }}</h3>
    <div class="card stack legal">
      <p>
        <b>KanjiVG</b> · © Ulrich Apel ·
        <a href="https://kanjivg.tagaini.net" target="_blank" rel="noopener">kanjivg.tagaini.net</a><br />
        {{ t('licenses.license') }}: <a :href="CC_BY_SA_3" target="_blank" rel="noopener">CC BY-SA 3.0</a><br />
        <span class="muted">{{ t('licenses.kanjivgChanges') }}</span>
      </p>
      <p>
        <b>KANJIDIC2</b> · {{ t('licenses.edrdgOwner') }}
        <a href="https://www.edrdg.org/" target="_blank" rel="noopener">Electronic Dictionary Research and Development Group</a>,
        {{ t('licenses.edrdgConformance') }}
        <a href="https://www.edrdg.org/edrdg/licence.html" target="_blank" rel="noopener">{{ t('licenses.edrdgLicence') }}</a>.<br />
        {{ t('licenses.license') }}: <a :href="CC_BY_SA_4" target="_blank" rel="noopener">CC BY-SA 4.0</a><br />
        <span class="muted">{{ t('licenses.kanjidicChanges') }}</span>
      </p>
      <p class="muted small">{{ t('licenses.shareAlike') }}</p>
    </div>

    <h3 class="section">{{ t('licenses.code') }}</h3>
    <p v-if="failed" class="muted small">{{ t('licenses.unavailable') }}</p>
    <ul v-else-if="notices" class="rows">
      <li v-for="pkg in notices.packages" :key="pkg.name">
        <details class="notice">
          <summary class="row">
            <span class="row-text"><b>{{ pkg.name }}</b><small>{{ pkg.version }}<template v-if="pkg.author"> · {{ pkg.author }}</template></small></span>
            <span class="row-end">{{ pkg.license }}</span>
          </summary>
          <pre>{{ pkg.text }}</pre>
        </details>
      </li>
      <li>
        <details class="notice">
          <summary class="row">
            <span class="row-text"><b>{{ t('licenses.android') }}</b><small>{{ t('licenses.androidCount', { n: notices.android.libraries.length }) }}</small></span>
            <span class="row-end">{{ notices.android.license }}</span>
          </summary>
          <ul class="libs">
            <li v-for="lib in notices.android.libraries" :key="`${lib.group}:${lib.name}`">{{ lib.group }}:{{ lib.name }} {{ lib.version }}</li>
          </ul>
          <pre>{{ notices.android.text }}</pre>
        </details>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.legal p { line-height: 1.55; overflow-wrap: anywhere; }
.legal p a { color: var(--indigo); text-decoration: underline; text-underline-offset: 2px; }
.notice summary { list-style: none; cursor: pointer; }
.notice summary::-webkit-details-marker { display: none; }
.notice[open] summary { border-radius: var(--r-md) var(--r-md) 0 0; }
.notice pre,
.libs {
  margin: 0;
  padding: 12px;
  background: var(--surface);
  border-radius: 0 0 var(--r-md) var(--r-md);
  font: 0.72rem/1.45 ui-monospace, 'SFMono-Regular', Menlo, monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--muted);
  max-height: 60dvh;
  overflow: auto;
}
.libs { list-style: none; border-radius: 0; border-bottom: 1px solid var(--line); }
</style>
