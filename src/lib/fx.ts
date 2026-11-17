import { state } from './store'
import type { Entry } from './types'

// Small synthesized cues and text-to-speech. Nothing here needs audio files.

let audio: AudioContext | undefined

function tone(freq: number, start: number, length: number, volume: number) {
  if (!audio) return
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, audio.currentTime + start)
  gain.gain.linearRampToValueAtTime(volume, audio.currentTime + start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + start + length)
  osc.connect(gain).connect(audio.destination)
  osc.start(audio.currentTime + start)
  osc.stop(audio.currentTime + start + length + 0.02)
}

export function cue(kind: 'good' | 'bad' | 'done') {
  if (!state.settings.sound) return
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
    if (kind === 'good') { tone(660, 0, 0.12, 0.08); tone(880, 0.09, 0.18, 0.08) }
    if (kind === 'bad') tone(196, 0, 0.22, 0.09)
    if (kind === 'done') { tone(523, 0, 0.14, 0.08); tone(659, 0.11, 0.14, 0.08); tone(784, 0.22, 0.3, 0.08) }
  } catch {
    /* no audio available */
  }
}

export function buzz(ms = 12) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* not supported */
  }
}

// ---- speech ----------------------------------------------------------------
// Inside the Android app we use the phone's own text-to-speech engine through a Capacitor plugin,
// because Android's WebView has no speechSynthesis. On the web we use the browser's voice.

const nativeApp = typeof window !== 'undefined' && ((window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() ?? false)
const webSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window

export const canSpeak = nativeApp || webSpeech

const RATE = { normal: 0.9, slow: 0.6 } as const

async function say(text: string) {
  const rate = RATE[state.settings.speech]
  if (nativeApp) {
    const { TextToSpeech } = await import('@capacitor-community/text-to-speech')
    await TextToSpeech.stop().catch(() => {})
    await TextToSpeech.speak({ text, lang: 'ja-JP', rate, pitch: 1, volume: 1, queueStrategy: 0 })
    return
  }
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  utterance.rate = rate
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

export function speak(text: string) {
  if (!canSpeak || !text) return
  say(text).catch(() => {
    /* no Japanese voice available */
  })
}

/** What to say for an entry: kana and words as written, kanji by their readings (a lone kanji is ambiguous). */
export function speechOf(entry: Entry): string {
  if (entry.kind !== 'kanji') return entry.text
  return entry.reading.split('·').map((r) => r.trim()).filter(Boolean).join('、')
}

export const sayEntry = (entry: Entry) => speak(speechOf(entry))
