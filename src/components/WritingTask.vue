<script setup lang="ts">
import { computed, ref } from 'vue'
import WritingPad from './WritingPad.vue'
import { segmentsOf } from '../lib/content'
import { buzz, canSpeak, cue, sayEntry } from '../lib/fx'
import type { Reason } from '../lib/grade'
import { t, tk } from '../lib/i18n'
import { FADE_AFTER, fade, meaningOf, promptOf } from '../lib/session'
import type { Entry, Stage, TaskResult } from '../lib/types'

const props = defineProps<{ entry: Entry; stage: Stage; last: boolean }>()
const emit = defineEmits<{ done: [result: TaskResult] }>()

const pad = ref<InstanceType<typeof WritingPad>>()
const segments = segmentsOf(props.entry)
const segmentDone = ref(segments.map((s) => !s.strokes))
const index = ref(segmentDone.value.indexOf(false))
const outline = ref(false)
const assisted = ref(false)
const mistakes = ref(0)
const why = ref<Reason | null>(null)
const finished = ref(index.value === -1)

const current = computed(() => segments[index.value])
const fading = computed(() => props.stage === 'fading')
const hintsOff = computed(() => fading.value && fade.streak >= FADE_AFTER)
const assist = computed(() => {
  if (props.stage === 'guided') return 'trace'
  if (fading.value) return hintsOff.value ? 'none' : 'trace'
  return props.stage === 'revealed' || outline.value ? 'ghost' : 'none'
})
const fromMemory = computed(() => props.stage === 'memory')
const title = computed(() => {
  if (fading.value) return t(hintsOff.value ? 'task.fadingOff' : 'task.fading')
  return t(props.stage === 'guided' ? 'task.trace' : props.stage === 'revealed' ? 'task.outline' : 'task.memory')
})
const sub = computed(() => {
  if (props.entry.kind === 'word' || props.entry.kind === 'kanji') return props.entry.reading
  return tk(`kind.${props.entry.kind}`)
})
const showAnswer = computed(() => !fromMemory.value || finished.value)

// New characters are introduced with their sound.
if (props.stage === 'guided') sayEntry(props.entry)

function onStroke(passed: boolean, reason: Reason) {
  if (fading.value) fade.streak = passed ? fade.streak + 1 : 0
  if (passed) {
    why.value = null
    buzz(8)
    return
  }
  why.value = reason
  if (fromMemory.value) mistakes.value += 1
  buzz(30)
}

function onComplete() {
  segmentDone.value[index.value] = true
  const next = segmentDone.value.indexOf(false)
  if (next !== -1) {
    setTimeout(() => {
      index.value = next
      outline.value = false
    }, 420)
    return
  }
  finished.value = true
  cue(assisted.value ? 'bad' : 'good')
  sayEntry(props.entry)
}

function hint() {
  if (fading.value) {
    fade.streak = 0
    return
  }
  pad.value?.hint()
  if (fromMemory.value) assisted.value = true
}

function toggleOutline() {
  outline.value = !outline.value
  if (outline.value) assisted.value = true
}

function erase() {
  pad.value?.reset()
  why.value = null
}

function next() {
  const correct = !assisted.value
  emit('done', { correct, grade: !correct ? 'again' : mistakes.value > 0 ? 'hard' : 'good' })
}
</script>

<template>
  <div class="task">
    <header class="task-prompt">
      <p class="eyebrow" :class="{ accent: hintsOff }">{{ title }}</p>
      <h1 class="task-main">{{ promptOf(entry) }}</h1>
      <p class="task-sub">
        <span>{{ sub }}</span>
        <button v-if="canSpeak && showAnswer" class="icon-btn small" type="button" aria-label="Play" @click="sayEntry(entry)">
          <svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" class="line" /></svg>
        </button>
      </p>
    </header>

    <div v-if="segments.length > 1" class="segments">
      <span
        v-for="(segment, i) in segments"
        :key="i"
        class="segment jp"
        :class="{ current: i === index && !finished, filled: segmentDone[i] }"
        lang="ja"
      >{{ segmentDone[i] || !fromMemory ? segment.char : '' }}</span>
    </div>

    <div class="pad-wrap">
      <WritingPad
        v-if="current?.strokes"
        ref="pad"
        :key="index"
        :strokes="current.strokes"
        :assist="assist"
        :hint-after="stage === 'guided' || fading ? 0 : 3"
        @stroke="onStroke"
        @hinted="assisted = fromMemory ? true : assisted"
        @complete="onComplete"
      />
      <p class="pad-note" :class="{ visible: why && !finished }">{{ why ? tk(`why.${why}`) : '\u00a0' }}</p>
    </div>

    <footer class="task-foot">
      <template v-if="!finished">
        <div class="tools">
          <button class="tool" type="button" @click="erase">
            <svg viewBox="0 0 24 24"><path class="line" d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
            {{ t('task.erase') }}
          </button>
          <button v-if="stage !== 'guided'" class="tool" type="button" @click="hint">
            <svg viewBox="0 0 24 24"><path class="line" d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" /></svg>
            {{ t('task.hint') }}
          </button>
          <button v-if="fromMemory" class="tool" type="button" :aria-pressed="outline" @click="toggleOutline">
            <svg viewBox="0 0 24 24"><path class="line" d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle class="line" cx="12" cy="12" r="3" /></svg>
            {{ outline ? t('task.hide') : t('task.show') }}
          </button>
        </div>
      </template>
      <div v-else class="verdict" :class="assisted ? 'is-bad' : 'is-good'">
        <div class="verdict-text">
          <strong>{{ assisted ? t('task.assisted') : t('task.correct') }}</strong>
          <span class="jp" lang="ja">{{ entry.text }}</span>
          <span v-if="meaningOf(entry) && entry.kind !== 'hiragana' && entry.kind !== 'katakana'" class="muted">{{ meaningOf(entry) }}</span>
        </div>
        <button class="btn primary" type="button" @click="next">{{ last ? t('task.finish') : t('task.next') }}</button>
      </div>
    </footer>
  </div>
</template>
