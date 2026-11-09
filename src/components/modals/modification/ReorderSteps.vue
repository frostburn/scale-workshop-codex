<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { parseAST } from 'sonic-weave/parser'
import { stepString } from 'sonic-weave/words'
import Modal from '@/components/ModalDialog.vue'
import { useScaleStore } from '@/stores/scale'

defineProps<{ show: boolean }>()
const emit = defineEmits(['done', 'cancel'])
const scale = useScaleStore()

// Use the same unstacking operation as the source that will be applied.
const { visitor, defaults } = scale.getUserScopeVisitor()
const usedDefaultScale = !visitor.currentScale.length
if (usedDefaultScale) {
  visitor.currentScale.push(...scale.relativeIntervals)
}
const originalWord = stepString(visitor.currentScale.map((interval) => interval.value))
visitor.executeProgram(parseAST('unstack()'))
const letters = [...new Set(originalWord)].sort()
const steps = shallowRef(
  visitor.currentScale.map((interval, id) => ({
    id,
    interval,
    cents: interval.totalCents(),
    letter: originalWord[id],
    color: `hsl(${(letters.indexOf(originalWord[id]) * 137.508 + 25) % 360}, 65%, 55%)`
  }))
)

const list = ref<HTMLOListElement | null>(null)
const dragging = ref<number | null>(null)
let pointerId: number | null = null

const preview = computed(() => {
  let cents = 0
  let value = steps.value[0].interval.value.pow(0)
  const values: (typeof value)[] = []
  const spans = steps.value.map((step, index) => {
    const start = cents
    cents += step.cents
    value = value.mul(step.interval.value)
    values.push(value)
    return { ...step, index, start, end: cents }
  })
  const positions = [0, ...spans.map((span) => span.end)]
  const min = Math.min(...positions)
  const max = Math.max(...positions)
  const range = max - min || 1
  const y = (position: number) => 330 - ((position - min) / range) * 300
  return {
    spans,
    word: stepString(values),
    hasNegative: spans.some((span) => span.cents < 0),
    y,
    ticks: Array.from({ length: 5 }, (_, i) => min + ((max - min) * i) / 4)
  }
})

function move(from: number, to: number) {
  if (to < 0 || to >= steps.value.length || from === to) return
  const reordered = [...steps.value]
  const [step] = reordered.splice(from, 1)
  reordered.splice(to, 0, step)
  steps.value = reordered
}

function startDrag(event: PointerEvent, id: number) {
  if (event.button !== 0 || !list.value) return
  dragging.value = id
  pointerId = event.pointerId
  list.value.setPointerCapture(event.pointerId)
}

function drag(event: PointerEvent) {
  if (dragging.value === null || event.pointerId !== pointerId || !list.value) return
  const bounds = list.value.getBoundingClientRect()
  if (event.clientY < bounds.top + 30) list.value.scrollTop -= 12
  if (event.clientY > bounds.bottom - 30) list.value.scrollTop += 12
  const others = [...list.value.children].filter(
    (row) => Number((row as HTMLElement).dataset.id) !== dragging.value
  )
  const to = others.filter((row) => {
    const rect = row.getBoundingClientRect()
    return event.clientY > rect.top + rect.height / 2
  }).length
  move(
    steps.value.findIndex((step) => step.id === dragging.value),
    to
  )
}

function endDrag() {
  if (pointerId !== null && list.value?.hasPointerCapture(pointerId)) {
    list.value.releasePointerCapture(pointerId)
  }
  dragging.value = null
  pointerId = null
}

function modify(expand = true) {
  // An empty source displays 12-TET; materialize it before permuting its steps.
  const source = usedDefaultScale ? `${scale.sourceText}\ntet(12)` : scale.sourceText
  const permutation = steps.value.map((step) => step.id).join(', ')
  const result = `${source}\nunstack()\n$ = $[[${permutation}]]\nstack()`
  if (expand) {
    visitor.executeProgram(parseAST(`$ = $[[${permutation}]]\nstack()`))
    scale.sourceText = visitor.expand(defaults)
  } else {
    scale.sourceText = result
  }
  scale.computeScale()
  emit('done')
}
</script>

<template>
  <Modal class="reorder-steps" :show="show" @confirm="modify" @cancel="$emit('cancel')">
    <template #header><h2>Reorder steps</h2></template>
    <template #body>
      <p>Drag the unstacked steps into a new order, or use the arrow buttons.</p>
      <div class="reorder-preview">
        <div class="step-list">
          <h3>Steps (bottom to top)</h3>
          <ol
            ref="list"
            aria-label="Unstacked steps"
            @pointermove="drag"
            @pointerup="endDrag"
            @pointercancel="endDrag"
            @lostpointercapture="endDrag"
          >
            <li
              v-for="(step, index) of steps"
              :key="step.id"
              :data-id="step.id"
              :class="{ dragging: dragging === step.id }"
              :style="{ borderLeftColor: step.color }"
            >
              <button
                class="drag-handle"
                :aria-label="`Drag step ${index + 1}; use arrow keys to reorder`"
                @pointerdown="startDrag($event, step.id)"
                @keydown.up.prevent="move(index, index - 1)"
                @keydown.down.prevent="move(index, index + 1)"
              >
                ⠿
              </button>
              <span class="step-description">
                <strong>{{ index + 1 }}. {{ step.letter }}</strong>
                <span>{{ step.interval.str(visitor.rootContext) }}</span>
                <small>{{ step.cents.toFixed(scale.centsFractionDigits) }} ¢</small>
              </span>
              <span class="move-buttons">
                <button
                  :aria-label="`Move step ${index + 1} up`"
                  :disabled="index === 0"
                  @click="move(index, index - 1)"
                >
                  ↑
                </button>
                <button
                  :aria-label="`Move step ${index + 1} down`"
                  :disabled="index === steps.length - 1"
                  @click="move(index, index + 1)"
                >
                  ↓
                </button>
              </span>
            </li>
          </ol>
        </div>
        <figure>
          <figcaption>Scale preview (¢)</figcaption>
          <svg viewBox="0 0 180 360" role="img" aria-label="Reordered scale ruler">
            <line x1="80" x2="80" y1="20" y2="340" class="ruler-line" />
            <g v-for="(tick, index) of preview.ticks" :key="index">
              <line
                x1="76"
                x2="84"
                :y1="preview.y(tick)"
                :y2="preview.y(tick)"
                class="ruler-line"
              />
              <text x="125" :y="preview.y(tick) + 4">{{ tick.toFixed(1) }}</text>
            </g>
            <g v-for="span of preview.spans" :key="span.id">
              <rect
                class="step-span"
                :data-step-id="span.id"
                :data-direction="span.cents < 0 ? 'negative' : 'positive'"
                :x="span.cents < 0 ? 42 : 84"
                :y="preview.y(Math.max(span.start, span.end))"
                width="34"
                :height="Math.max(1, Math.abs(preview.y(span.start) - preview.y(span.end)))"
                :fill="span.color"
                :fill-opacity="dragging === null || dragging === span.id ? 1 : 0.35"
              >
                <title>
                  Step {{ span.index + 1 }}: {{ span.letter }},
                  {{ span.cents.toFixed(scale.centsFractionDigits) }} cents
                </title>
              </rect>
              <line
                x1="76"
                x2="84"
                :y1="preview.y(span.end)"
                :y2="preview.y(span.end)"
                class="ruler-line"
              />
            </g>
            <text :x="preview.hasNegative ? 38 : 72" :y="preview.y(0) + 4" text-anchor="end">
              1/1
            </text>
          </svg>
          <small v-if="preview.hasNegative"
            >Descending steps on the left; ascending steps on the right.</small
          >
        </figure>
      </div>
      <p class="step-string" aria-live="polite">
        <strong>stepString: </strong><code>{{ preview.word }}</code>
      </p>
    </template>
    <template #footer>
      <div class="btn-group">
        <button @click="modify(true)">OK</button>
        <button @click="$emit('cancel')">Cancel</button>
        <button @click="modify(false)">Raw</button>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.reorder-steps :deep(.modal-container) {
  width: min(42rem, calc(100vw - 2rem));
  min-width: 0;
  max-width: 42rem;
  box-sizing: border-box;
}
.reorder-preview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 11rem;
  gap: 1rem;
  margin-top: 1rem;
}
h3,
figcaption {
  font-size: 1rem;
  margin: 0 0 0.5rem;
}
ol {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 24rem;
  overflow-y: auto;
}
li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  padding: 0.35rem;
  border: 1px solid var(--color-border);
  border-left: 0.5rem solid;
  border-radius: 3px;
  background: var(--color-background-soft);
}
li.dragging {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}
.drag-handle {
  cursor: grab;
  touch-action: none;
  user-select: none;
  padding: 0.25rem;
}
.dragging .drag-handle {
  cursor: grabbing;
}
.step-description {
  display: flex;
  flex-direction: column;
  overflow-wrap: anywhere;
  min-width: 0;
  flex: 1;
}
.move-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.move-buttons button {
  padding: 0 0.4rem;
}
figure {
  margin: 0;
}
svg {
  display: block;
  width: 100%;
}
.ruler-line {
  stroke: var(--color-text);
}
text {
  fill: var(--color-text);
  font-size: 11px;
}
.step-span {
  stroke: var(--color-background);
  stroke-width: 0.5;
}
.step-string {
  overflow-wrap: anywhere;
  margin: 1rem 0;
}
@media (max-width: 500px) {
  .reorder-preview {
    grid-template-columns: minmax(0, 1fr) 7rem;
    gap: 0.5rem;
  }
  li {
    gap: 0.25rem;
  }
}
</style>
