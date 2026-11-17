import { computed, reactive, ref, watch } from 'vue'
import { entries } from './content'
import { isNew, isWeak, newCard, rate, type StoredCard } from './srs'
import type { CardType, Grade } from './types'

const KEY = 'kaikata:v1'
const DAY = 86_400_000
export const CARD_TYPES: CardType[] = ['writing', 'reading']

export interface Progress {
  learnedAt: number
  cards: Partial<Record<CardType, StoredCard>>
}

export interface Settings {
  theme: 'auto' | 'light' | 'dark'
  lang: 'auto' | 'en' | 'id'
  deckId: string
  sessionSize: number
  reviewTypes: 'both' | CardType
  sound: boolean
  speech: 'normal' | 'slow'
}

export interface SaveData {
  v: 1
  createdAt: number
  entries: Record<string, Progress>
  stars: Record<string, number>
  days: Record<string, { n: number; ok: number }>
  misses: { day: string; keys: string[] }
  settings: Settings
}

export interface DueCard {
  entryId: string
  type: CardType
  card: StoredCard
}

export const dayKey = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const startOfDay = (ms: number) => new Date(ms).setHours(0, 0, 0, 0)
export const cardKey = (entryId: string, type: CardType) => `${entryId}~${type}`

function defaults(): SaveData {
  return {
    v: 1,
    createdAt: Date.now(),
    entries: {},
    stars: {},
    days: {},
    misses: { day: dayKey(Date.now()), keys: [] },
    settings: { theme: 'auto', lang: 'auto', deckId: 'hiragana', sessionSize: 20, reviewTypes: 'both', sound: true, speech: 'normal' },
  }
}

function parse(json: string | null): SaveData | null {
  if (!json) return null
  try {
    const data = JSON.parse(json) as Partial<SaveData>
    if (data.v !== 1 || typeof data.entries !== 'object' || data.entries === null) return null
    const base = defaults()
    return { ...base, ...data, settings: { ...base.settings, ...data.settings }, misses: data.misses ?? base.misses } as SaveData
  } catch {
    return null
  }
}

function read(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export const state = reactive<SaveData>(parse(read()) ?? defaults())

let saveTimer: ReturnType<typeof setTimeout> | undefined
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable: keep working in memory */
  }
}
watch(state, () => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(save, 250)
}, { deep: true })
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', save)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save()
    else now.value = Date.now()
  })
}

/** A slow clock so "due" counts refresh on their own. */
export const now = ref(Date.now())
setInterval(() => (now.value = Date.now()), 30_000)

// ---- actions ---------------------------------------------------------------

export const isLearned = (entryId: string) => state.entries[entryId] !== undefined

/** Mark entries as learned and create their review cards, due right away. */
export function learn(entryIds: string[]) {
  const t = Date.now()
  for (const id of entryIds) {
    if (state.entries[id] || !entries[id]) continue
    state.entries[id] = { learnedAt: t, cards: { writing: newCard(t), reading: newCard(t) } }
  }
  now.value = t
}

export function unlearn(entryId: string) {
  delete state.entries[entryId]
}

function countReview(correct: boolean, t: number) {
  const key = dayKey(t)
  const day = (state.days[key] ??= { n: 0, ok: 0 })
  day.n += 1
  if (correct) day.ok += 1
}

/** Record a graded review of one card and reschedule it. */
export function review(entryId: string, type: CardType, grade: Grade, correct: boolean) {
  const t = Date.now()
  const progress = state.entries[entryId]
  if (!progress) return
  progress.cards[type] = rate(progress.cards[type] ?? newCard(t), grade, t)
  countReview(correct, t)
  noteMiss(entryId, type, correct, t)
  now.value = t
}

/** Count practice that is not scheduled (learning, challenges, extra practice). */
export function practiced(entryId: string, type: CardType, correct: boolean) {
  const t = Date.now()
  countReview(correct, t)
  if (isLearned(entryId)) noteMiss(entryId, type, correct, t)
}

function noteMiss(entryId: string, type: CardType, correct: boolean, t: number) {
  const today = dayKey(t)
  if (state.misses.day !== today) state.misses = { day: today, keys: [] }
  const key = cardKey(entryId, type)
  const at = state.misses.keys.indexOf(key)
  if (correct && at !== -1) state.misses.keys.splice(at, 1)
  if (!correct && at === -1) state.misses.keys.push(key)
}

export function setStars(lessonId: string, stars: number) {
  if (stars > (state.stars[lessonId] ?? 0)) state.stars[lessonId] = stars
}

// ---- queries ---------------------------------------------------------------

const allCards = computed<DueCard[]>(() => {
  const list: DueCard[] = []
  for (const [entryId, progress] of Object.entries(state.entries)) {
    if (!entries[entryId]) continue
    for (const type of CARD_TYPES) {
      const card = progress.cards[type]
      if (card) list.push({ entryId, type, card })
    }
  }
  return list
})

const wanted = (type: CardType) => state.settings.reviewTypes === 'both' || state.settings.reviewTypes === type

export const dueCards = computed(() =>
  allCards.value.filter((c) => wanted(c.type) && c.card.due <= now.value).sort((a, b) => a.card.due - b.card.due),
)

export const missedCards = computed(() => {
  if (state.misses.day !== dayKey(now.value)) return []
  const keys = new Set(state.misses.keys)
  return allCards.value.filter((c) => keys.has(cardKey(c.entryId, c.type)))
})

export const recentCards = computed(() => {
  const since = startOfDay(now.value) - 6 * DAY
  return allCards.value.filter((c) => wanted(c.type) && state.entries[c.entryId].learnedAt >= since)
})

export const weakCards = computed(() => allCards.value.filter((c) => wanted(c.type) && isWeak(c.card)))

/** Cards coming due per day for the next `days` days; today includes everything overdue. */
export const forecast = computed(() => {
  const today = startOfDay(now.value)
  const days = Array.from({ length: 7 }, (_, i) => ({ at: today + i * DAY, count: 0 }))
  for (const c of allCards.value) {
    if (!wanted(c.type)) continue
    const index = c.card.due <= now.value ? 0 : Math.floor((startOfDay(c.card.due) - today) / DAY)
    if (index >= 0 && index < days.length) days[index].count += 1
  }
  return days
})

export const week = computed(() => {
  const today = startOfDay(now.value)
  return Array.from({ length: 7 }, (_, i) => {
    const at = today - (6 - i) * DAY
    return { at, ...(state.days[dayKey(at)] ?? { n: 0, ok: 0 }) }
  })
})

export const stats = computed(() => {
  const keys = Object.keys(state.days).filter((k) => state.days[k].n > 0).sort()
  let best = 0
  let run = 0
  let previous = -Infinity
  for (const key of keys) {
    const at = new Date(`${key}T00:00:00`).getTime()
    run = Math.round((at - previous) / DAY) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    previous = at
  }
  const today = startOfDay(now.value)
  const active = (ms: number) => (state.days[dayKey(ms)]?.n ?? 0) > 0
  let streak = 0
  for (let at = active(today) ? today : today - DAY; active(at); at -= DAY) streak += 1
  return {
    streak,
    best,
    reviews: keys.reduce((sum, k) => sum + state.days[k].n, 0),
    studyDays: keys.length,
    learned: Object.keys(state.entries).filter((id) => entries[id]).length,
    since: state.createdAt,
  }
})

export const cardsOf = (entryId: string) => state.entries[entryId]?.cards ?? {}
export { isNew }

// ---- backup ----------------------------------------------------------------

export const exportData = () => JSON.stringify(state, null, 1)

export function importData(json: string): boolean {
  const data = parse(json)
  if (!data) return false
  Object.assign(state, data)
  return true
}

export function resetAll() {
  const fresh = defaults()
  Object.assign(state, { ...fresh, settings: state.settings })
}
