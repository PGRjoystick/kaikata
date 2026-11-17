import { allEntries, entries, lessons, writable } from './content'
import { dueCards, isLearned, missedCards, recentCards, state, weakCards, now, type DueCard } from './store'
import type { CardType, Entry, Stage } from './types'
import { reactive } from 'vue'
import { lang } from './i18n'

export type Mode = 'learn' | 'practice' | 'test' | 'review' | 'entry'
export type ReviewSet = 'due' | 'misses' | 'recent' | 'weak'

export interface Item {
  key: string
  entryId: string
  type: CardType
  stage: Stage
  /** Graded items reschedule their card. */
  graded: boolean
  /** Counts toward the session score. */
  scored: boolean
  retries: number
}

/** Fading practice: hints are shown until this many strokes in a row are right; a miss brings them back. */
export const FADE_AFTER = 3
export const fade = reactive({ streak: 0 })

export function shuffle<T>(list: T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Keep the two cards of one entry from landing back to back. */
function spread(items: Item[]): Item[] {
  for (let i = 1; i < items.length; i++) {
    if (items[i].entryId !== items[i - 1].entryId) continue
    const swap = items.findIndex((it, j) => j > i && it.entryId !== items[i].entryId)
    if (swap !== -1) [items[i], items[swap]] = [items[swap], items[i]]
  }
  return items
}

const item = (entryId: string, type: CardType, stage: Stage, extra: Partial<Item> = {}): Item => ({
  key: `${entryId}~${type}~${stage}`,
  entryId,
  type,
  stage,
  graded: false,
  scored: false,
  retries: 0,
  ...extra,
})

/** Entries of a lesson that have not been learned yet (or all of them when everything is learned). */
export function newEntriesOf(lessonId: string): string[] {
  const ids = lessons[lessonId]?.entryIds ?? []
  return ids.filter((id) => !isLearned(id))
}

/** Learn: trace it, write it over the outline, write it from memory, then a quick reading recap. */
export function learnQueue(lessonId: string): Item[] {
  const fresh = newEntriesOf(lessonId)
  const ids = fresh.length ? fresh : (lessons[lessonId]?.entryIds ?? [])
  const writing = ids
    .filter((id) => writable(entries[id]))
    .flatMap((id) => (['guided', 'revealed', 'memory'] as Stage[]).map((stage) => item(id, 'writing', stage)))
  const recap = shuffle(ids).map((id) => item(id, 'reading', 'memory', { scored: true }))
  return [...writing, ...recap]
}

/** Practice where the hints fade: once through in order, then once more shuffled. */
export function practiceQueue(lessonId: string): Item[] {
  const ids = (lessons[lessonId]?.entryIds ?? []).filter((id) => writable(entries[id]))
  return [...ids.map((id) => item(id, 'writing', 'fading')), ...shuffle(ids).map((id) => item(id, 'writing', 'fading', { key: `${id}~writing~fading~2` }))]
}

/** Challenge: everything in the lesson from memory, for stars. */
export const testQueue = (lessonId: string): Item[] =>
  shuffle((lessons[lessonId]?.entryIds ?? []).filter((id) => writable(entries[id]))).map((id) => item(id, 'writing', 'memory', { scored: true }))

export const entryQueue = (entryId: string): Item[] =>
  entries[entryId] && writable(entries[entryId]) ? (['guided', 'revealed', 'memory'] as Stage[]).map((stage) => item(entryId, 'writing', stage)) : []

export function reviewCards(set: ReviewSet): DueCard[] {
  if (set === 'misses') return missedCards.value
  if (set === 'recent') return recentCards.value
  if (set === 'weak') return weakCards.value
  return dueCards.value
}

export function reviewQueue(set: ReviewSet): Item[] {
  const cards = reviewCards(set)
    .filter((c) => c.type === 'reading' || writable(entries[c.entryId]))
    .slice(0, set === 'due' ? state.settings.sessionSize : 40)
  return spread(shuffle(cards).map((c) => item(c.entryId, c.type, 'memory', { graded: c.card.due <= now.value, scored: true })))
}

// ---- prompts and answers ---------------------------------------------------

export const meaningOf = (entry: Entry) => (lang.value === 'id' && entry.meaningId ? entry.meaningId : entry.meaning) ?? ''

/** What the learner is asked to write: the sound for kana, the meaning for words and kanji. */
export const promptOf = (entry: Entry) => (entry.kind === 'word' || entry.kind === 'kanji' ? meaningOf(entry) : entry.reading)

/** The label used as an answer in reading questions. */
export const answerOf = (entry: Entry) => promptOf(entry)

export interface Choice {
  id: string
  label: string
  correct: boolean
}

/** Four answers: the right one and three look-alikes from the same deck, learned ones first. */
export function choicesFor(entry: Entry): Choice[] {
  const answer = answerOf(entry)
  const seen = new Set([answer])
  const pool = allEntries.filter((e) => e.kind === entry.kind && e.id !== entry.id)
  const ranked = [
    ...shuffle(pool.filter((e) => e.lessonId === entry.lessonId)),
    ...shuffle(pool.filter((e) => e.lessonId !== entry.lessonId && isLearned(e.id))),
    ...shuffle(pool.filter((e) => e.lessonId !== entry.lessonId && !isLearned(e.id))),
  ]
  const wrong: Choice[] = []
  for (const candidate of ranked) {
    const label = answerOf(candidate)
    if (seen.has(label)) continue
    seen.add(label)
    wrong.push({ id: candidate.id, label, correct: false })
    if (wrong.length === 3) break
  }
  return shuffle([{ id: entry.id, label: answer, correct: true }, ...wrong])
}
