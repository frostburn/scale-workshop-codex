<script setup lang="ts">
import { formatHertz, formatExponential } from '@/utils'

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
</script>

<template>
  <tr :class="{ active, equave }" :style="'background-color:' + color + ';'">
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
