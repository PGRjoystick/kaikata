import rawGlyphs from '../data/glyphs.json'
import rawKanji from '../data/kanji.json'
import type { Deck, Entry, Kind, Lesson, Pt } from './types'

// ---- glyphs (stroke order data, KanjiVG) -----------------------------------

const GLYPHS = rawGlyphs as unknown as Record<string, number[][]>
const glyphMemo = new Map<string, Pt[][] | null>()

/** Strokes of one character as points in a 0..1 box, or null when we have no data. */
export function strokesOf(char: string): Pt[][] | null {
  let hit = glyphMemo.get(char)
  if (hit === undefined) {
    const raw = GLYPHS[char]
    hit = raw
      ? raw.map((flat) => {
          const pts: Pt[] = []
          for (let i = 0; i < flat.length; i += 2) pts.push({ x: flat[i] / 1000, y: flat[i + 1] / 1000 })
          return pts
        })
      : null
    glyphMemo.set(char, hit)
  }
  return hit
}

export interface Segment {
  char: string
  strokes: Pt[][] | null
}

export function segmentsOf(entry: Entry): Segment[] {
  return Array.from(entry.text, (char) => ({ char, strokes: strokesOf(char) }))
}

// ---- kana ------------------------------------------------------------------

const KANA_ROWS: [string, string][] = [
  ['あいうえお', 'a i u e o'],
  ['かきくけこ', 'ka ki ku ke ko'],
  ['さしすせそ', 'sa shi su se so'],
  ['たちつてと', 'ta chi tsu te to'],
  ['なにぬねの', 'na ni nu ne no'],
  ['はひふへほ', 'ha hi fu he ho'],
  ['まみむめも', 'ma mi mu me mo'],
  ['やゆよ', 'ya yu yo'],
  ['らりるれろ', 'ra ri ru re ro'],
  ['わをん', 'wa wo n'],
  ['がぎぐげご', 'ga gi gu ge go'],
  ['ざじずぜぞ', 'za ji zu ze zo'],
  ['だぢづでど', 'da ji(di) zu(du) de do'],
  ['ばびぶべぼ', 'ba bi bu be bo'],
  ['ぱぴぷぺぽ', 'pa pi pu pe po'],
]

const toKatakana = (s: string) => Array.from(s, (c) => String.fromCodePoint(c.codePointAt(0)! + 0x60)).join('')

// ---- words -----------------------------------------------------------------

/** [text, romaji, English, Indonesian] */
const WORDS: [string, string, string, string][] = [
  ['ねこ', 'neko', 'cat', 'kucing'],
  ['いぬ', 'inu', 'dog', 'anjing'],
  ['さかな', 'sakana', 'fish', 'ikan'],
  ['とり', 'tori', 'bird', 'burung'],
  ['うま', 'uma', 'horse', 'kuda'],

  ['みず', 'mizu', 'water', 'air'],
  ['おちゃ', 'ocha', 'tea', 'teh'],
  ['ごはん', 'gohan', 'rice, meal', 'nasi, makan'],
  ['すし', 'sushi', 'sushi', 'sushi'],
  ['たまご', 'tamago', 'egg', 'telur'],

  ['やま', 'yama', 'mountain', 'gunung'],
  ['かわ', 'kawa', 'river', 'sungai'],
  ['うみ', 'umi', 'sea', 'laut'],
  ['そら', 'sora', 'sky', 'langit'],
  ['はな', 'hana', 'flower', 'bunga'],

  ['あさ', 'asa', 'morning', 'pagi'],
  ['ひる', 'hiru', 'noon, daytime', 'siang'],
  ['よる', 'yoru', 'night', 'malam'],
  ['きょう', 'kyō', 'today', 'hari ini'],
  ['あした', 'ashita', 'tomorrow', 'besok'],

  ['ともだち', 'tomodachi', 'friend', 'teman'],
  ['せんせい', 'sensei', 'teacher', 'guru'],
  ['がっこう', 'gakkō', 'school', 'sekolah'],
  ['ほん', 'hon', 'book', 'buku'],
  ['なまえ', 'namae', 'name', 'nama'],

  ['ありがとう', 'arigatō', 'thank you', 'terima kasih'],
  ['こんにちは', 'konnichiwa', 'hello', 'halo'],
  ['さようなら', 'sayōnara', 'goodbye', 'selamat tinggal'],
  ['おはよう', 'ohayō', 'good morning', 'selamat pagi'],
  ['すみません', 'sumimasen', 'excuse me, sorry', 'permisi, maaf'],

  ['パン', 'pan', 'bread', 'roti'],
  ['コーヒー', 'kōhī', 'coffee', 'kopi'],
  ['テレビ', 'terebi', 'television', 'televisi'],
  ['カメラ', 'kamera', 'camera', 'kamera'],
  ['ホテル', 'hoteru', 'hotel', 'hotel'],

  ['バス', 'basu', 'bus', 'bus'],
  ['タクシー', 'takushī', 'taxi', 'taksi'],
  ['トイレ', 'toire', 'toilet', 'toilet'],
  ['ノート', 'nōto', 'notebook', 'buku catatan'],
  ['ペン', 'pen', 'pen', 'pena'],

  ['アメリカ', 'amerika', 'America', 'Amerika'],
  ['インドネシア', 'indoneshia', 'Indonesia', 'Indonesia'],
  ['レストラン', 'resutoran', 'restaurant', 'restoran'],
  ['スマホ', 'sumaho', 'smartphone', 'ponsel pintar'],
  ['ゲーム', 'gēmu', 'game', 'permainan'],
]

// ---- kanji (KANJIDIC2) -----------------------------------------------------

interface RawKanji {
  text: string
  on: string[]
  kun: string[]
  meanings: string[]
}

// ---- assembly --------------------------------------------------------------

export const entries: Record<string, Entry> = {}
export const decks: Deck[] = []

function addDeck(id: string, icon: string, kind: Kind, groups: { subtitle: string; items: Omit<Entry, 'id' | 'kind' | 'deckId' | 'lessonId'>[] }[]) {
  const lessons: Lesson[] = groups.map((group, i) => {
    const lessonId = `${id}-${i + 1}`
    for (const item of group.items) entries[item.text] = { ...item, id: item.text, kind, deckId: id, lessonId }
    return { id: lessonId, deckId: id, number: i + 1, subtitle: group.subtitle, entryIds: group.items.map((it) => it.text) }
  })
  decks.push({ id, icon, lessons })
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

const kanaGroups = (convert: (s: string) => string) =>
  KANA_ROWS.map(([chars, romaji]) => {
    const readings = romaji.split(' ').map((r) => r.replace('(', ' (').replace(')', ')'))
    return {
      subtitle: readings.map((r) => r.split(' ')[0]).join(' · '),
      items: Array.from(convert(chars), (text, i) => ({ text, reading: readings[i] })),
    }
  })

addDeck('hiragana', 'あ', 'hiragana', kanaGroups((s) => s))
addDeck('katakana', 'ア', 'katakana', kanaGroups(toKatakana))
addDeck(
  'words',
  '語',
  'word',
  chunk(WORDS, 5).map((group) => ({
    subtitle: group.map((w) => w[2].split(',')[0]).join(' · '),
    items: group.map(([text, reading, meaning, meaningId]) => ({ text, reading, meaning, meaningId })),
  })),
)
addDeck(
  'kanji',
  '字',
  'kanji',
  chunk(rawKanji as RawKanji[], 5).map((group) => {
    const items = group.map((k) => {
      const meanings = k.meanings.filter((m) => !/radical/i.test(m))
      const readings = [...k.on.slice(0, 2), ...k.kun.slice(0, 2).map((r) => r.replace('.', ''))]
      return { text: k.text, reading: readings.join(' · '), meaning: (meanings.length ? meanings : k.meanings).slice(0, 3).join(', ') }
    })
    return { subtitle: items.map((it) => it.meaning.split(',')[0]).join(' · '), items }
  }),
)

export const lessons: Record<string, Lesson> = Object.fromEntries(decks.flatMap((d) => d.lessons).map((l) => [l.id, l]))
export const allEntries: Entry[] = Object.values(entries)

export const deckOf = (id: string): Deck => decks.find((d) => d.id === id) ?? decks[0]
export const deckEntries = (deck: Deck): Entry[] => deck.lessons.flatMap((l) => l.entryIds.map((id) => entries[id]))

/** Whether an entry can be practiced by hand (at least one character has stroke data). */
export const writable = (entry: Entry) => segmentsOf(entry).some((s) => s.strokes)
