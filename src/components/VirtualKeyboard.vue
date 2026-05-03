<script setup lang="ts">
import { LEFT_MOUSE_BTN } from '@/constants'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import VirtualKeyboardKey from '@/components/VirtualKeyboardKey.vue'
import VirtualKeyInfo from '@/components/VirtualKeyInfo.vue'
import type { Scale } from '@/scale'
import { axisOffset } from '@/utils'

type NoteOff = () => void
type NoteOnCallback = (index: number) => NoteOff
type ColorMap = (index: number) => string
type LabelMap = (index: number) => string

const props = defineProps<{
  baseIndex: number // Should incorporate equave shift
  isomorphicHorizontal: number[]
  isomorphicVertical: number[]
  noteOn: NoteOnCallback
  heldNotes: Map<number, number>
  scale: Scale
  colorMap: ColorMap
  labelMap: LabelMap
  showLabel: boolean
  showCents: boolean
  showRatio: boolean
  showFrequency: boolean
}>()

type VirtualKey = {
  x: number
  y: number
  index: number
  color: string
  frequency: number
  cents: number
  ratio: number
  label: string
}

const virtualKeys = computed(() => {
  const horizontal = props.isomorphicHorizontal
  const vertical = props.isomorphicVertical
  const result: [number, VirtualKey[]][] = []
  for (let y = 3; y >= -1; y--) {
    const row = []
    for (let x = 0; x <= 12; ++x) {
      const index = props.baseIndex + axisOffset(x, horizontal) + axisOffset(y, vertical)
      const color = props.colorMap(index)
      const ratio = props.scale.getRatio(index)
      const frequency = props.scale.baseFrequency * ratio
      const cents = props.scale.getCents(index)
      const label = props.labelMap(index)
      row.push({
        x,
        y,
        index,
        color,
        frequency,
        cents,
        ratio,
        label
      })
    }
    result.push([y, row])
  }
  return result
})

const isMousePressed = ref(false)
const noteOffs: Map<number, NoteOff> = new Map()

function start(index: number) {
  end(index)
  noteOffs.set(index, props.noteOn(index))
}

function end(index: number) {
  if (noteOffs.has(index)) {
    noteOffs.get(index)!()
    noteOffs.delete(index)
  }
}

function isActive(index: number) {
  return noteOffs.has(index)
}

function onTouchStart(event: TouchEvent, index: number) {
  event.preventDefault()
  start(index)
}

function onTouchEnd(event: TouchEvent, index: number) {
  event.preventDefault()
  end(index)
}

function onMouseDown(event: MouseEvent, index: number) {
  if (event.button !== LEFT_MOUSE_BTN) {
    return
  }
  event.preventDefault()
  isMousePressed.value = true
  start(index)
}

function onMouseUp(event: MouseEvent, index: number) {
  if (event.button !== LEFT_MOUSE_BTN) {
    return
  }
  event.preventDefault()
  end(index)
}

function onMouseEnter(event: MouseEvent, index: number) {
  if (!isMousePressed.value) {
    return
  }
  event.preventDefault()
  start(index)
}

function onMouseLeave(event: MouseEvent, index: number) {
  if (!isMousePressed.value) {
    return
  }
  event.preventDefault()
  end(index)
}

function windowMouseUp(event: MouseEvent) {
  if (event.button !== LEFT_MOUSE_BTN) {
    return
  }
  isMousePressed.value = false
  noteOffs.forEach((off) => off())
  noteOffs.clear()
}

onMounted(() => {
  window.addEventListener('mouseup', windowMouseUp)
})

onUnmounted(() => {
  noteOffs.forEach((off) => off())
  window.removeEventListener('mouseup', windowMouseUp)
})
</script>

<template>
  <table>
    <tbody>
      <tr v-for="[y, row] of virtualKeys" :key="y" :class="{ 'hidden-sm': y < 0 || y > 3 }">
        <VirtualKeyboardKey
          v-for="key of row"
          :key="key.x"
          :class="{ 'hidden-sm': key.x > 8 }"
          :index="key.index"
          :color="key.color"
          :active="isActive(key.index)"
          :held="(heldNotes.get(key.index) || 0) > 0"
          @touchstart="onTouchStart($event, key.index)"
          @touchend="onTouchEnd($event, key.index)"
          @touchcancel="onTouchEnd($event, key.index)"
          @mousedown="onMouseDown($event, key.index)"
          @mouseup="onMouseUp($event, key.index)"
          @mouseenter="onMouseEnter($event, key.index)"
          @mouseleave="onMouseLeave($event, key.index)"
        >
          <VirtualKeyInfo
            :label="key.label"
            :cents="key.cents"
            :ratio="key.ratio"
            :frequency="key.frequency"
            :showLabel="props.showLabel"
            :showCents="props.showCents"
            :showRatio="props.showRatio"
            :showFrequency="props.showFrequency"
          />
        </VirtualKeyboardKey>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
table {
  background-color: white;
  border-spacing: 0;
  width: 100%;
  height: 100%;
  min-width: 500px; /* this stops the keys getting too close together for portrait mobile users */
  table-layout: fixed;
}
</style>
