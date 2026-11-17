<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ReadingTask from '../components/ReadingTask.vue'
import WritingTask from '../components/WritingTask.vue'
import { entries, lessons } from '../lib/content'
import { cue } from '../lib/fx'
import { t } from '../lib/i18n'
import { fade, entryQueue, learnQueue, newEntriesOf, practiceQueue, reviewCards, reviewQueue, testQueue, type Item, type Mode, type ReviewSet } from '../lib/session'
import { learn, practiced, review, setStars } from '../lib/store'
import type { TaskResult } from '../lib/types'

const route = useRoute()
const router = useRouter()
const mode = String(route.params.mode) as Mode
const target = String(route.params.id ?? '')

function build(): Item[] {
  fade.streak = 0
  if (mode === 'learn') return learnQueue(target)
  if (mode === 'practice') return practiceQueue(target)
  if (mode === 'test') return testQueue(target)
  if (mode === 'entry') return entryQueue(target)
  return reviewQueue((target || 'due') as ReviewSet)
}

const toLearn = mode === 'learn' ? newEntriesOf(target) : []
const queue = ref<Item[]>(build())
const index = ref(0)
const round = ref(0)
const finished = ref(queue.value.length === 0)
const scored = ref(0)
const right = ref(0)
const stars = ref(0)
const learnedCount = ref(0)

const item = computed(() => queue.value[index.value])
const entry = computed(() => entries[item.value.entryId])
const progress = computed(() => (queue.value.length ? index.value / queue.value.length : 1))
const back = computed(() => {
  if (mode === 'review') return '/review'
  if (lessons[target]) return `/lesson/${target}`
  return entries[target] ? `/lesson/${entries[target].lessonId}` : '/'
})
const more = computed(() => (mode === 'review' ? reviewCards((target || 'due') as ReviewSet).length : 0))

function onDone(result: TaskResult) {
  const current = item.value
  if (current.scored && current.retries === 0) {
    scored.value += 1
    if (result.correct) right.value += 1
  }
  if (current.graded && current.retries === 0) review(current.entryId, current.type, result.grade, result.correct)
  else if (current.stage === 'memory') practiced(current.entryId, current.type, result.correct)

  // Missed from memory: it comes back once more at the end of the session.
  if (!result.correct && current.stage === 'memory' && current.retries < 2) {
    queue.value.push({ ...current, key: `${current.key}~${current.retries + 1}`, graded: false, retries: current.retries + 1 })
  }

  if (index.value + 1 < queue.value.length) {
    index.value += 1
    return
  }
  finish()
}

function finish() {
  if (mode === 'learn' && toLearn.length) {
    learn(toLearn)
    learnedCount.value = toLearn.length
  }
  if (mode === 'test' && scored.value > 0) {
    const ratio = right.value / scored.value
    stars.value = ratio === 1 ? 3 : ratio >= 0.75 ? 2 : 1
    setStars(target, stars.value)
  }
  finished.value = true
  cue('done')
}

function again() {
  queue.value = build()
  index.value = 0
  round.value += 1
  scored.value = 0
  right.value = 0
  finished.value = queue.value.length === 0
}
</script>

<template>
  <main class="session">
    <header class="session-bar">
      <button class="icon-btn" type="button" :aria-label="t('task.quit')" @click="router.replace(back)">
        <svg viewBox="0 0 24 24"><path class="line" d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <div class="meter"><i :style="{ width: `${(finished ? 1 : progress) * 100}%` }" /></div>
      <span class="session-count">{{ finished ? queue.length : index + 1 }}/{{ queue.length }}</span>
    </header>

    <template v-if="!finished">
      <ReadingTask v-if="item.type === 'reading'" :key="`${round}-${item.key}`" :entry="entry" :last="index === queue.length - 1" @done="onDone" />
      <WritingTask v-else :key="`${round}-${item.key}`" :entry="entry" :stage="item.stage" :last="index === queue.length - 1" @done="onDone" />
    </template>

    <section v-else class="summary">
      <template v-if="queue.length">
        <div v-if="mode === 'test'" class="stars huge">
          <svg v-for="n in 3" :key="n" viewBox="0 0 24 24" :class="{ on: n <= stars }" :style="{ animationDelay: `${n * 0.18}s` }"><path d="M12 3.500l2.6 5.4 5.9.8-4.3 4.1 1 5.900L12 17l-5.2 2.7 1-5.900L3.5 9.700l5.9-.8z" /></svg>
        </div>
        <div v-else class="summary-seal jp" lang="ja">済</div>
        <h1>{{ t('done.title') }}</h1>
        <p v-if="learnedCount" class="summary-line">{{ t('done.learned', { n: learnedCount }) }}</p>
        <p v-if="scored" class="summary-line">{{ t('done.score', { ok: right, n: scored }) }}</p>
      </template>
      <p v-else class="muted">{{ t('done.empty') }}</p>
      <div class="stack">
        <button v-if="more > 0" class="btn primary" type="button" @click="again">{{ t('done.again') }} · {{ more }}</button>
        <button class="btn" :class="more > 0 ? 'quiet' : 'primary'" type="button" @click="router.replace(back)">{{ t('done.back') }}</button>
      </div>
    </section>
  </main>
</template>
