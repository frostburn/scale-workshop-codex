<script setup lang="ts">
import { formatHertz, formatExponential } from '@/utils'
import { nextTick, onMounted, ref } from 'vue'

const props = defineProps<{
  index: number
  frequency: number
  cents: number
  ratio: number
  label: string
  color: string
  active: boolean
  isRoot: boolean
  equave: boolean
}>()

const element = ref<HTMLTableRowElement | null>(null)

function getScrollableAncestor(node: HTMLElement) {
  let current = node.parentElement

  while (current) {
    const { overflowY } = window.getComputedStyle(current)
    const isScrollable = ['auto', 'scroll', 'overlay'].includes(overflowY) && current.scrollHeight > current.clientHeight

    if (isScrollable) {
      return current
    }

    current = current.parentElement
  }

  return null
}

function scrollRootRowIntoView() {
  if (!element.value) {
    return
  }

  const scrollContainer = getScrollableAncestor(element.value)

  if (scrollContainer) {
    const rowRect = element.value.getBoundingClientRect()
    const containerRect = scrollContainer.getBoundingClientRect()
    const targetTop = rowRect.top - containerRect.top + scrollContainer.scrollTop - (scrollContainer.clientHeight - rowRect.height) / 2

    scrollContainer.scrollTo({ top: targetTop, behavior: 'auto' })
    return
  }

  element.value.scrollIntoView({ block: 'center' })
}

onMounted(() => {
  const isMediumOrLarger = window.matchMedia('screen and (min-width: 600px)').matches

  if (props.isRoot && isMediumOrLarger) {
    nextTick(() => {
      requestAnimationFrame(scrollRootRowIntoView)
    })
  }
})
</script>

<template>
  <tr ref="element" :class="{ active, equave }" :style="'background-color:' + color + ';'">
    <td class="key-color" :style="'background-color:' + color + ' !important;'"></td>
    <td>{{ index }}</td>
    <td>{{ formatHertz(frequency) }}</td>
    <td>{{ formatExponential(cents) }}</td>
    <td>{{ formatExponential(ratio) }}</td>
    <td>{{ label }}</td>
  </tr>
</template>

<style scoped>
tr:not(.active) td:not(.key-color) {
  background-color: var(--color-background-semitransparent);
}
tr.active {
  background-color: var(--color-accent) !important;
  color: var(--color-accent-text);
}
.equave td {
  font-weight: bold;
}
.key-color {
  border-bottom: 1px solid var(--color-background-mute);
}
</style>
