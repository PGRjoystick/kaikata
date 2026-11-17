import { shapeSimilarity } from 'curve-matcher'
import type { Pt } from './types'

export type Reason = 'ok' | 'too-short' | 'misplaced' | 'wrong-direction' | 'wrong-shape' | 'wrong-order'

export interface Verdict {
  passed: boolean
  reason: Reason
  score: number
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)

export function pathLength(pts: Pt[]): number {
  let total = 0
  for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1], pts[i])
  return total
}

function boxCenter(pts: Pt[]): Pt {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of pts) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
}

function similarity(a: Pt[], b: Pt[]): number {
  const score = shapeSimilarity(a, b, { estimationPoints: 64, rotations: 8, restrictRotationAngle: 0.12 * Math.PI, checkRotations: true })
  return Number.isFinite(score) ? score : 0
}

const SHORT = 0.16 // strokes shorter than this (dots, dakuten ticks) are judged by placement, not shape
const MIN_SCORE = 0.72
const HOOK_ANGLE = (70 * Math.PI) / 180

/**
 * The reference strokes are brush strokes, and many end in a small flick back (hane).
 * Handwriting usually leaves that flick out, so we also accept the stroke without it.
 * Returns the stroke up to the flick, or null when it has none.
 */
export function withoutHook(pts: Pt[]): Pt[] | null {
  if (pts.length < 3) return null
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]))
  const total = cum[cum.length - 1]
  const end = pts[pts.length - 1]
  let cut = -1
  let sharpest = HOOK_ANGLE
  for (let i = 1; i < pts.length - 1; i++) {
    const tail = total - cum[i]
    if (tail > total * 0.4 || tail > 0.2 || cum[i] < 0.08) continue
    // direction coming in, measured over the previous stretch of the stroke
    let from = i - 1
    while (from > 0 && cum[i] - cum[from] < 0.08) from--
    const ax = pts[i].x - pts[from].x, ay = pts[i].y - pts[from].y
    const bx = end.x - pts[i].x, by = end.y - pts[i].y
    const angle = Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / ((Math.hypot(ax, ay) || 1) * (Math.hypot(bx, by) || 1)))))
    if (angle > sharpest) {
      sharpest = angle
      cut = i
    }
  }
  return cut === -1 ? null : pts.slice(0, cut + 1)
}

const ok = (score: number): Verdict => ({ passed: true, reason: 'ok', score })
const fail = (reason: Reason, score = 0): Verdict => ({ passed: false, reason, score })

function fit(target: Pt[], drawn: Pt[]): Verdict {
  const tLen = pathLength(target)
  const dLen = pathLength(drawn)
  const tStart = target[0], tEnd = target[target.length - 1]
  const dStart = drawn[0], dEnd = drawn[drawn.length - 1]
  const offset = dist(boxCenter(target), boxCenter(drawn))

  if (tLen < SHORT) {
    if (offset > 0.2 || dLen > Math.max(0.4, tLen * 3.5)) return fail('misplaced')
    if (dLen > 0.05 && tLen > 0.05) {
      const dot = ((dEnd.x - dStart.x) * (tEnd.x - tStart.x) + (dEnd.y - dStart.y) * (tEnd.y - tStart.y)) / (dist(dStart, dEnd) * dist(tStart, tEnd) || 1)
      if (dot < -0.2) return fail('wrong-direction')
    }
    return ok(1)
  }

  if (drawn.length < 2 || dLen < tLen * 0.4) return fail('too-short')
  if (dLen > tLen * 2.2) return fail('wrong-shape')
  if (offset > 0.22) return fail('misplaced')

  const closed = dist(tStart, tEnd) < 0.06
  if (!closed && (dist(dStart, tStart) > 0.28 || dist(dEnd, tEnd) > 0.3)) {
    const reversed = dist(dStart, tEnd) < 0.2 && dist(dEnd, tStart) < 0.2
    return fail(reversed ? 'wrong-direction' : 'misplaced')
  }

  let score = similarity(drawn, target)
  if (closed) score = Math.max(score, similarity([...drawn].reverse(), target))
  return score >= MIN_SCORE ? ok(score) : fail('wrong-shape', score)
}

/**
 * Compare one drawn stroke against the expected stroke. Both are in a 0..1 box.
 * A stroke passes when it is in the right place, runs in the right direction and has the right shape.
 */
export function gradeStroke(target: Pt[], drawn: Pt[]): Verdict {
  if (drawn.length === 0) return fail('too-short')
  const full = fit(target, drawn)
  if (full.passed) return full
  const plain = withoutHook(target)
  if (plain) {
    const second = fit(plain, drawn)
    if (second.passed) return second
  }
  return full
}

/**
 * Grade a stroke as the next stroke of a character. When it does not fit but is a good
 * rendering of a stroke that comes later, say so: the learner has the order wrong, not the shape.
 */
export function gradeAttempt(strokes: Pt[][], index: number, drawn: Pt[]): Verdict {
  const verdict = gradeStroke(strokes[index], drawn)
  if (verdict.passed) return verdict
  for (let later = index + 1; later < strokes.length; later++) {
    if (gradeStroke(strokes[later], drawn).passed) return fail('wrong-order', verdict.score)
  }
  return verdict
}

/** Smooth SVG path through points, scaled to `size` units. */
export function pathD(pts: Pt[], size = 100): string {
  if (pts.length === 0) return ''
  const f = (n: number) => (n * size).toFixed(2)
  if (pts.length === 1) return `M${f(pts[0].x)},${f(pts[0].y)}l0.01,0`
  let d = `M${f(pts[0].x)},${f(pts[0].y)}`
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2
    d += `Q${f(pts[i].x)},${f(pts[i].y)} ${f(mx)},${f(my)}`
  }
  const last = pts[pts.length - 1]
  return `${d}L${f(last.x)},${f(last.y)}`
}
