<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import StrokePreview from './StrokePreview.vue'
import { entries, strokesOf, writable } from '../lib/content'
import { canSpeak, sayEntry } from '../lib/fx'
import { locale, t, tk } from '../lib/i18n'
import { meaningOf } from '../lib/session'
import { CARD_TYPES, cardsOf, isLearned, isNew, learn, now, unlearn } from '../lib/store'

const props = defineProps<{ entryId: string }>()
const emit = defineEmits<{ close: [] }>()
const router = useRouter()

const entry = computed(() => entries[props.entryId])
const chars = computed(() => Array.from(entry.value.text))
const strokeCount = computed(() => chars.value.reduce((n, c) => n + (strokesOf(c)?.length ?? 0), 0))
const learned = computed(() => isLearned(props.entryId))

const schedule = computed(() =>
  CARD_TYPES.flatMap((type) => {
    const card = cardsOf(props.entryId)[type]
    if (!card) return []
    const when = isNew(card)
      ? t('entry.new')
      : card.due <= now.value
        ? t('entry.dueNow')
        : new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short' }).format(card.due)
    return [{ type, when }]
  }),
)

sayEntry(entry.value)

function practice() {
  emit('close')
  void router.push(`/session/entry/${encodeURIComponent(props.entryId)}`)
}
</script>

<template>
  <div class="sheet-backdrop" @click.self="emit('close')">
    <section class="sheet" role="dialog" aria-modal="true">
      <button class="sheet-grip" type="button" aria-label="Close" @click="emit('close')" />
      <div class="sheet-head">
        <div>
          <h2 class="sheet-title jp" lang="ja">{{ entry.text }}</h2>
          <p class="sheet-reading">{{ entry.reading }}</p>
          <p v-if="meaningOf(entry)" class="muted">{{ meaningOf(entry) }}</p>
        </div>
        <button v-if="canSpeak" class="icon-btn" type="button" aria-label="Play" @click="sayEntry(entry)">
          <svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" class="line" /></svg>
        </button>
      </div>

      <div class="sheet-previews" :class="{ many: chars.length > 1 }">
        <StrokePreview v-for="(char, i) in chars" :key="`${entryId}-${i}`" :char="char" animate />
      </div>
      <p class="muted center small">{{ tk(`kind.${entry.kind}`) }} · {{ t('entry.strokes', { n: strokeCount }) }} · {{ t('entry.replay') }}</p>

      <dl v-if="learned" class="facts">
        <div v-for="row in schedule" :key="row.type">
          <dt>{{ tk(`review.${row.type}`) }} · {{ t('entry.next') }}</dt>
          <dd>{{ row.when }}</dd>
        </div>
      </dl>
      <p v-else class="muted center">{{ t('entry.notLearned') }}</p>

      <div class="stack">
        <button v-if="writable(entry)" class="btn primary" type="button" @click="practice">{{ t('entry.practice') }}</button>
        <button v-if="!learned" class="btn ghost" type="button" @click="learn([entryId])">{{ t('entry.markLearned') }}</button>
        <button v-else class="btn ghost danger" type="button" @click="unlearn(entryId)">{{ t('entry.forget') }}</button>
      </div>
    </section>
  </div>
</template>
