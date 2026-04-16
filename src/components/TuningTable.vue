<script setup lang="ts">
import { computed, nextTick, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import TuningTableRow from '@/components/TuningTableRow.vue'
import { mmod } from 'xen-dev-utils/fraction'

const props = defineProps<{
  baseFrequency: number
  frequencies: number[] // All 128 frequencies
  centsValues: number[] // All 128 cents values
  heldNotes: Map<number, number>
  baseMidiNote: number
  labels: string[] // Labels from #1 to the equave
  colors: string[] // Colors from #1 to the equave
}>()

const tableElement = ref<HTMLTableElement | null>(null)

function centerRootRow(attempt = 0) {
  const isMediumOrLarger = window.matchMedia('screen and (min-width: 600px)').matches
  if (!isMediumOrLarger || !tableElement.value) {
    return
  }

  const row = tableElement.value.tBodies.item(0)?.rows.item(props.baseMidiNote)
  const scrollContainer = tableElement.value.parentElement

  if (!row || !scrollContainer) {
    return
  }

  if ((row.offsetHeight === 0 || scrollContainer.clientHeight === 0) && attempt < 10) {
    requestAnimationFrame(() => centerRootRow(attempt + 1))
    return
  }

  const targetTop = row.offsetTop - (scrollContainer.clientHeight - row.offsetHeight) / 2
  scrollContainer.scrollTo({ top: targetTop, behavior: 'auto' })
}

function scheduleRootRowCentering() {
  nextTick(() => {
    requestAnimationFrame(() => centerRootRow())
  })
}

function scheduleIfVisible() {
  if (document.visibilityState === 'visible') {
    scheduleRootRowCentering()
  }
}

onMounted(scheduleRootRowCentering)
onActivated(scheduleRootRowCentering)

onMounted(() => {
  document.addEventListener('visibilitychange', scheduleIfVisible)
  window.addEventListener('pageshow', scheduleRootRowCentering)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', scheduleIfVisible)
  window.removeEventListener('pageshow', scheduleRootRowCentering)
})

watch(() => props.baseMidiNote, scheduleRootRowCentering)

const rows = computed(() => {
  const inverseBaseFrequency = 1 / props.baseFrequency
  return props.frequencies.map((frequency, i) => {
    const active = (props.heldNotes.get(i) ?? 0) > 0
    const index = i - props.baseMidiNote
    const ratio = frequency * inverseBaseFrequency
    const cents = props.centsValues[i]
    return {
      index: i,
      active,
      frequency,
      cents,
      ratio: ratio,
      label: props.labels[mmod(index - 1, props.labels.length)],
      color: props.colors[mmod(index - 1, props.colors.length)],
      isRoot: index === 0,
      equave: mmod(index, props.labels.length) === 0
    }
  })
})
</script>

<template>
  <table ref="tableElement">
    <thead>
      <tr>
        <th>&nbsp;</th>
        <th>#</th>
        <th>Freq</th>
        <th>Cents</th>
        <th>Ratio</th>
        <th>Label</th>
      </tr>
    </thead>
    <tbody>
      <TuningTableRow v-for="row of rows" :key="row.index" v-bind="row" />
    </tbody>
  </table>
</template>

<style scoped>
table {
  width: 100%;
  text-align: center;
  border-spacing: 0;
}
table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  font-weight: bold;
}
table table tr:nth-of-type(2n) {
  background-color: var(--color-background-soft);
}
</style>
