import { createEmptyCard, fsrs, generatorParameters, Rating, type Card } from 'ts-fsrs'
import type { Grade } from './types'

/** An FSRS card with dates stored as epoch milliseconds so it survives JSON. */
export type StoredCard = Omit<Card, 'due' | 'last_review'> & { due: number; last_review?: number }

const scheduler = fsrs(generatorParameters({ enable_fuzz: true, enable_short_term: false, maximum_interval: 365 }))

const store = (card: Card): StoredCard => ({ ...card, due: card.due.getTime(), last_review: card.last_review?.getTime() })

const RATING = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good } as const

export function newCard(now: number): StoredCard {
  return store(createEmptyCard(new Date(now)))
}

export function rate(card: StoredCard, grade: Grade, now: number): StoredCard {
  const input: Card = { ...card, due: new Date(card.due), last_review: card.last_review === undefined ? undefined : new Date(card.last_review) }
  return store(scheduler.next(input, new Date(now), RATING[grade]).card)
}

export const isNew = (card: StoredCard) => card.reps === 0
/** Cards that keep slipping: forgotten at least twice and still short-lived. */
export const isWeak = (card: StoredCard) => card.lapses >= 2 && card.stability < 30
