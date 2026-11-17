<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { gradeAttempt, pathD, type Reason } from '../lib/grade'
import type { Pt } from '../lib/types'

const props = defineProps<{
  strokes: Pt[][]
  /** trace: outline plus the next stroke animated · ghost: outline plus a start mark · none: blank */
  assist: 'trace' | 'ghost' | 'none'
  /** How many failed tries on one stroke before the stroke is shown. 0 turns this off. */
  hintAfter?: number
}>()

const emit = defineEmits<{
  stroke: [passed: boolean, reason: Reason]
  hinted: []
  complete: []
}>()

const svg = ref<SVGSVGElement>()
const accepted = ref(0)
const drawing = ref<Pt[] | null>(null)
const pointer = ref<number | null>(null)
const rejected = ref<{ d: string; run: number } | null>(null)
const hintIndex = ref<number | null>(null)
const traceRun = ref(0)
const fails = ref(0)

const targetPaths = computed(() => props.strokes.map((s) => pathD(s)))
const done = computed(() => accepted.value >= props.strokes.length)
const traceIndex = computed(() => {
  if (done.value) return null
  if (props.assist === 'trace') return accepted.value
  return hintIndex.value === accepted.value ? accepted.value : null
})
/** In outline mode a dot marks where the next stroke starts, so order is never a guess. */
const cueIndex = computed(() => (props.assist === 'ghost' && !done.value && traceIndex.value === null ? accepted.value : null))
const live = computed(() => (drawing.value ? pathD(drawing.value) : ''))

watch(() => props.strokes, reset)

function reset() {
  accepted.value = 0
  drawing.value = null
  pointer.value = null
  rejected.value = null
  hintIndex.value = null
  fails.value = 0
  traceRun.value += 1
}

/** Animate the next expected stroke. */
function hint() {
  if (done.value) return
  hintIndex.value = accepted.value
  traceRun.value += 1
}

function point(event: PointerEvent): Pt {
  const box = svg.value!.getBoundingClientRect()
  return { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height }
}

function down(event: PointerEvent) {
  if (done.value || pointer.value !== null) return
  pointer.value = event.pointerId
  svg.value?.setPointerCapture(event.pointerId)
  drawing.value = [point(event)]
  rejected.value = null
}

function move(event: PointerEvent) {
  if (event.pointerId !== pointer.value || !drawing.value) return
  const events = event.getCoalescedEvents?.() ?? []
  for (const e of events.length ? events : [event]) {
    const p = point(e)
    const last = drawing.value[drawing.value.length - 1]
    if (Math.hypot(p.x - last.x, p.y - last.y) > 0.006) drawing.value.push(p)
  }
}

function up(event: PointerEvent) {
  if (event.pointerId !== pointer.value) return
  const drawn = drawing.value ?? []
  pointer.value = null
  drawing.value = null
  const target = props.strokes[accepted.value]
  if (!target || drawn.length === 0) return

  const verdict = gradeAttempt(props.strokes, accepted.value, drawn)
  if (verdict.passed) {
    accepted.value += 1
    fails.value = 0
    hintIndex.value = null
    traceRun.value += 1
    emit('stroke', true, 'ok')
    if (done.value) emit('complete')
    return
  }
  fails.value += 1
  rejected.value = { d: pathD(drawn), run: (rejected.value?.run ?? 0) + 1 }
  emit('stroke', false, verdict.reason)
  if (traceIndex.value !== null) return
  if (verdict.reason === 'wrong-order' && props.assist !== 'none') {
    hint() // the outline is already showing, so pointing at the right stroke gives nothing away
  } else if (props.hintAfter && fails.value >= props.hintAfter) {
    hint()
    emit('hinted')
  }
}

function cancel(event: PointerEvent) {
  if (event.pointerId !== pointer.value) return
  pointer.value = null
  drawing.value = null
}

defineExpose({ reset, hint, accepted, done })
</script>

<template>
  <svg
    ref="svg"
    class="pad"
    :class="{ done }"
    viewBox="0 0 100 100"
    @pointerdown.prevent="down"
    @pointermove.prevent="move"
    @pointerup.prevent="up"
    @pointercancel="cancel"
    @lostpointercapture="cancel"
  >
    <g class="pad-grid">
      <line x1="50" y1="3" x2="50" y2="97" />
      <line x1="3" y1="50" x2="97" y2="50" />
    </g>

    <template v-if="assist !== 'none' && !done">
      <path v-for="(d, i) in targetPaths" v-show="i >= accepted" :key="`ghost-${i}`" class="pad-ghost" :d="d" />
    </template>

    <path v-for="(d, i) in targetPaths.slice(0, accepted)" :key="`ink-${i}`" class="pad-ink" :class="{ fresh: i === accepted - 1 }" :d="d" />

    <g v-if="traceIndex !== null" :key="`trace-${traceIndex}-${traceRun}`">
      <path class="pad-trace" :d="targetPaths[traceIndex]" pathLength="1" />
      <circle class="pad-start" :cx="strokes[traceIndex][0].x * 100" :cy="strokes[traceIndex][0].y * 100" r="2.6" />
    </g>

    <circle v-if="cueIndex !== null" class="pad-cue" :cx="strokes[cueIndex][0].x * 100" :cy="strokes[cueIndex][0].y * 100" r="2.6" />

    <path v-if="rejected" :key="`bad-${rejected.run}`" class="pad-bad" :d="rejected.d" />
    <path v-if="live" class="pad-live" :d="live" />
  </svg>
</template>

<style scoped>
.pad {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  border-radius: var(--r-lg);
  background: var(--paper);
  border: 1.5px solid var(--line);
  transition: border-color 0.3s;
}
.pad.done {
  border-color: var(--good);
}
.pad path,
.pad line {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.pad-grid line {
  stroke: var(--line);
  stroke-width: 0.5;
  stroke-dasharray: 1.6 2.4;
}
.pad-ghost {
  stroke: var(--ghost);
  stroke-width: 5.5;
}
.pad-ink {
  stroke: var(--ink);
  stroke-width: 5.5;
}
.pad-ink.fresh {
  animation: settle 0.28s ease-out;
}
.pad-live {
  stroke: var(--ink);
  stroke-width: 5;
  opacity: 0.85;
}
.pad-bad {
  stroke: var(--bad);
  stroke-width: 5;
  animation: reject 0.9s ease-out forwards;
}
.pad-trace {
  stroke: var(--accent);
  stroke-width: 5.5;
  stroke-dasharray: 1 3;
  stroke-dashoffset: 1.2;
  animation: trace 1.7s ease-in-out infinite;
}
.pad-cue {
  fill: var(--accent);
  stroke: var(--paper);
  stroke-width: 1;
  animation: pulse 1.7s ease-in-out infinite;
}
.pad-start {
  fill: var(--accent);
  stroke: var(--paper);
  stroke-width: 1;
  animation: pulse 1.7s ease-in-out infinite;
}
@keyframes trace {
  0%, 8% { stroke-dashoffset: 1.2; opacity: 1; }
  70% { stroke-dashoffset: 0; opacity: 1; }
  88% { stroke-dashoffset: 0; opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 0; }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  60% { opacity: 0.45; }
}
@keyframes settle {
  from { stroke: var(--accent); stroke-width: 7.5; }
  to { stroke: var(--ink); stroke-width: 5.5; }
}
@keyframes reject {
  0% { opacity: 1; transform: translateX(0); }
  15% { transform: translateX(-1.2px); }
  30% { transform: translateX(1.2px); }
  30.1%, 60% { transform: translateX(0); opacity: 1; }
  100% { opacity: 0; transform: translateX(0); }
}
@media (prefers-reduced-motion: reduce) {
  .pad-trace { animation: none; stroke-dashoffset: 0; opacity: 0.7; }
  .pad-start, .pad-cue, .pad-ink.fresh { animation: none; }
}
</style>
