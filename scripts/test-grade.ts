// Stroke grading checks. Simulates the ways real handwriting differs from the reference strokes
// (wobble, size, tilt, shift, rounded corners, missing end hooks) and reports how often good
// strokes are refused and bad ones accepted. Run with: npm test
import { readFileSync } from 'node:fs'
import { gradeAttempt, gradeStroke, pathLength, withoutHook } from '../src/lib/grade.ts'

type Pt = { x: number; y: number }
const raw: Record<string, number[][]> = JSON.parse(readFileSync(new URL('../src/data/glyphs.json', import.meta.url), 'utf8'))
const toPts = (flat: number[]): Pt[] => flat.reduce<Pt[]>((out, v, i) => (i % 2 ? out : [...out, { x: v / 1000, y: flat[i + 1] / 1000 }]), [])

let seed = 11
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
const between = (a: number, b: number) => a + rand() * (b - a)

/** Evenly spaced points along the path, like a finger moving at steady speed. */
function resample(pts: Pt[], step = 0.012): Pt[] {
  const out: Pt[] = [pts[0]]
  let carry = 0
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    let at = step - carry
    while (at <= seg) {
      out.push({ x: pts[i - 1].x + ((pts[i].x - pts[i - 1].x) * at) / seg, y: pts[i - 1].y + ((pts[i].y - pts[i - 1].y) * at) / seg })
      at += step
    }
    carry = seg - (at - step)
  }
  const last = pts[pts.length - 1]
  if (Math.hypot(last.x - out[out.length - 1].x, last.y - out[out.length - 1].y) > step / 3) out.push(last)
  return out
}

/** People round corners off. */
function rounded(pts: Pt[]): Pt[] {
  let cur = pts
  for (let pass = 0; pass < 2; pass++) {
    const next: Pt[] = [cur[0]]
    for (let i = 0; i < cur.length - 1; i++) {
      next.push({ x: cur[i].x * 0.75 + cur[i + 1].x * 0.25, y: cur[i].y * 0.75 + cur[i + 1].y * 0.25 })
      next.push({ x: cur[i].x * 0.25 + cur[i + 1].x * 0.75, y: cur[i].y * 0.25 + cur[i + 1].y * 0.75 })
    }
    next.push(cur[cur.length - 1])
    cur = next
  }
  return cur
}

interface Hand { wobble: number; scale: [number, number]; tilt: number; shift: number }
const NEAT: Hand = { wobble: 0.01, scale: [0.92, 1.08], tilt: 4, shift: 0.03 }
const TYPICAL: Hand = { wobble: 0.018, scale: [0.85, 1.2], tilt: 8, shift: 0.05 }
const SLOPPY: Hand = { wobble: 0.028, scale: [0.78, 1.28], tilt: 12, shift: 0.075 }

/** One glyph-wide distortion (size, tilt, shift) shared by all strokes, plus per-stroke wobble. */
function hand(h: Hand) {
  const sx = between(...h.scale), sy = between(...h.scale)
  const a = (between(-h.tilt, h.tilt) * Math.PI) / 180
  const dx = between(-h.shift, h.shift), dy = between(-h.shift, h.shift)
  return (pts: Pt[]): Pt[] => {
    const p1 = rand() * 6.28, p2 = rand() * 6.28, f1 = between(1, 2.5), f2 = between(1, 2.5)
    const dense = resample(rounded(pts))
    return dense.map((p, i) => {
      const t = i / Math.max(1, dense.length - 1)
      const x = (p.x - 0.5) * sx, y = (p.y - 0.5) * sy
      return {
        x: 0.5 + x * Math.cos(a) - y * Math.sin(a) + dx + Math.sin(t * 6.28 * f1 + p1) * h.wobble + (rand() - 0.5) * 0.006,
        y: 0.5 + x * Math.sin(a) + y * Math.cos(a) + dy + Math.sin(t * 6.28 * f2 + p2) * h.wobble + (rand() - 0.5) * 0.006,
      }
    })
  }
}

const glyphs = Object.entries(raw).map(([char, g]) => ({ char, strokes: g.map(toPts) }))
const pct = (n: number, d: number) => `${((n / Math.max(1, d)) * 100).toFixed(1)}%`

function refusals(name: string, h: Hand, prepare: (s: Pt[]) => Pt[] | null = (s) => s) {
  let total = 0, refused = 0
  const why: Record<string, number> = {}
  const samples: string[] = []
  for (let round = 0; round < 3; round++) {
    for (const { char, strokes } of glyphs) {
      const draw = hand(h)
      strokes.forEach((target, i) => {
        const source = prepare(target)
        if (!source) return
        total++
        const verdict = gradeAttempt(strokes, i, draw(source))
        if (verdict.passed) return
        refused++
        why[verdict.reason] = (why[verdict.reason] ?? 0) + 1
        if (samples.length < 6) samples.push(`${char}#${i + 1}`)
      })
    }
  }
  console.log(`${name.padEnd(34)} refused ${pct(refused, total).padStart(6)} of ${total}  ${JSON.stringify(why)}  ${samples.join(' ')}`)
  return refused / Math.max(1, total)
}

console.log('— good strokes that get refused (lower is better) —')
const neat = refusals('neat hand', NEAT)
const typical = refusals('typical hand', TYPICAL)
refusals('sloppy hand', SLOPPY)
const hookless = refusals('typical hand, end hook left out', TYPICAL, withoutHook)
refusals('typical hand, last 12% missing', TYPICAL, (s) => {
  const dense = resample(s, 0.004)
  return pathLength(s) > 0.2 ? dense.slice(0, Math.ceil(dense.length * 0.88)) : null
})

console.log('— bad strokes that get accepted (lower is better) —')
let long = 0, reversed = 0, moved = 0, other = 0, otherTotal = 0, order = 0
for (const { strokes } of glyphs) {
  const draw = hand(NEAT)
  strokes.forEach((target, i) => {
    if (pathLength(target) < 0.25) return
    long++
    const closed = Math.hypot(target[0].x - target.at(-1)!.x, target[0].y - target.at(-1)!.y) < 0.06
    if (!closed && gradeStroke(target, draw([...target].reverse())).passed) reversed++
    if (gradeStroke(target, draw(target).map((p) => ({ x: p.x + 0.3, y: p.y + 0.25 }))).passed) moved++
    strokes.forEach((wrong, j) => {
      if (j <= i) return
      otherTotal++
      const verdict = gradeAttempt(strokes, i, draw(wrong))
      if (verdict.passed) other++
      else if (verdict.reason === 'wrong-order') order++
    })
  })
}
console.log(`reversed ${pct(reversed, long)} · moved away ${pct(moved, long)} · a later stroke drawn instead ${pct(other, otherTotal)} (recognised as wrong order: ${pct(order, otherTotal)})`)

const u = glyphs.find((g) => g.char === 'う')!.strokes
const tick = resample([{ x: 0.39, y: 0.15 }, { x: 0.47, y: 0.175 }, { x: 0.555, y: 0.19 }])
console.log('う first stroke drawn as a plain tick:', JSON.stringify(gradeAttempt(u, 0, tick)))
console.log('う second stroke drawn first:', JSON.stringify(gradeAttempt(u, 0, hand(TYPICAL)(u[1]))))

process.exitCode = neat > 0.01 || typical > 0.04 || hookless > 0.06 || reversed / long > 0.01 || moved > 0 ? 1 : 0
