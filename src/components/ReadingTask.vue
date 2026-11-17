<script setup lang="ts">
import { ref } from 'vue'
import { buzz, canSpeak, cue, sayEntry } from '../lib/fx'
import { t } from '../lib/i18n'
import { choicesFor } from '../lib/session'
import type { Entry, TaskResult } from '../lib/types'

const props = defineProps<{ entry: Entry; last: boolean }>()
const emit = defineEmits<{ done: [result: TaskResult] }>()

const choices = choicesFor(props.entry)
const picked = ref<string | null>(null)
const correct = ref(false)

function pick(id: string) {
  if (picked.value !== null) return
  picked.value = id
  correct.value = id === props.entry.id
  cue(correct.value ? 'good' : 'bad')
  buzz(correct.value ? 8 : 30)
  sayEntry(props.entry)
}

function next() {
  emit('done', { correct: correct.value, grade: correct.value ? 'good' : 'again' })
}
</script>

<template>
  <div class="task">
    <header class="task-prompt">
      <p class="eyebrow">{{ t('task.read') }}</p>
    </header>

    <div class="reading-card">
      <span class="reading-text jp" :class="{ long: entry.text.length > 3 }" lang="ja">{{ entry.text }}</span>
      <button v-if="canSpeak && picked !== null" class="icon-btn small" type="button" aria-label="Play" @click="sayEntry(entry)">
        <svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" class="line" /></svg>
      </button>
    </div>

    <div class="choices">
      <button
        v-for="choice in choices"
        :key="choice.id"
        class="choice"
        :class="{
          right: picked !== null && choice.correct,
          wrong: picked === choice.id && !choice.correct,
          dim: picked !== null && !choice.correct && picked !== choice.id,
        }"
        type="button"
        :disabled="picked !== null"
        @click="pick(choice.id)"
      >{{ choice.label }}</button>
    </div>

    <footer class="task-foot">
      <div v-if="picked !== null" class="verdict" :class="correct ? 'is-good' : 'is-bad'">
        <div class="verdict-text">
          <strong>{{ correct ? t('task.correct') : t('task.wrong') }}</strong>
          <span v-if="entry.kind === 'word' || entry.kind === 'kanji'" class="muted">{{ entry.reading }}</span>
        </div>
        <button class="btn primary" type="button" @click="next">{{ last ? t('task.finish') : t('task.next') }}</button>
      </div>
    </footer>
  </div>
</template>
