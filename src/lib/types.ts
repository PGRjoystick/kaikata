export interface Pt {
  x: number
  y: number
}

export type Kind = 'hiragana' | 'katakana' | 'word' | 'kanji'
export type CardType = 'writing' | 'reading'
/** guided: trace · revealed: outline stays · fading: hints go away as you get strokes right · memory: blank */
export type Stage = 'guided' | 'revealed' | 'fading' | 'memory'
export type Grade = 'again' | 'hard' | 'good'

export interface Entry {
  id: string
  text: string
  kind: Kind
  /** romaji for kana and words, on/kun readings for kanji */
  reading: string
  meaning?: string
  meaningId?: string
  deckId: string
  lessonId: string
}

export interface Lesson {
  id: string
  deckId: string
  number: number
  subtitle: string
  entryIds: string[]
}

export interface Deck {
  id: string
  icon: string
  lessons: Lesson[]
}

export interface TaskResult {
  correct: boolean
  grade: Grade
}
