<script setup lang="ts">
import { computed, ref } from 'vue'
import { pathD } from '../lib/grade'
import { strokesOf } from '../lib/content'

const props = defineProps<{ char: string; animate?: boolean }>()

const run = ref(0)
const strokes = computed(() => strokesOf(props.char) ?? [])
const paths = computed(() => strokes.value.map((s) => pathD(s)))
</script>

<template>
  <svg v-if="paths.length" class="preview" :class="{ animate }" viewBox="0 0 100 100" @click="run += 1">
    <g class="preview-grid">
      <line x1="50" y1="4" x2="50" y2="96" />
      <line x1="4" y1="50" x2="96" y2="50" />
    </g>
    <g :key="run">
      <path v-for="(d, i) in paths" :key="i" class="preview-stroke" :d="d" pathLength="1" :style="{ animationDelay: `${0.25 + i * 0.55}s` }" />
    </g>
  </svg>
  <span v-else class="preview-text jp" lang="ja">{{ char }}</span>
</template>

<style scoped>
.preview {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  border-radius: var(--r-md);
  background: var(--paper);
  border: 1.5px solid var(--line);
}
.preview path,
.preview line {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.preview-grid line {
  stroke: var(--line);
  stroke-width: 0.6;
  stroke-dasharray: 1.6 2.4;
}
.preview-stroke {
  stroke: var(--ink);
  stroke-width: 5.5;
}
.preview.animate .preview-stroke {
  stroke-dasharray: 1 3;
  stroke-dashoffset: 1.2;
  animation: ink 0.5s ease-in-out forwards;
}
.preview-text {
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 1;
  font-size: 3rem;
}
@keyframes ink {
  to { stroke-dashoffset: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .preview.animate .preview-stroke { animation: none; stroke-dashoffset: 0; }
}
</style>
