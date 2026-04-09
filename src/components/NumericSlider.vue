<script setup lang="ts">
import { computed } from 'vue'

// Pass through native input attributes like min/max/step/id/class.
const props = defineProps<Record<string, unknown>>()

const model = defineModel<number>()

const wrapper = computed({
  get: () => model.value,
  set(newValue: number | string) {
    const parsed = typeof newValue === 'number' ? newValue : parseFloat(newValue)
    if (!Number.isNaN(parsed)) {
      model.value = parsed
    }
  }
})
</script>

<template>
  <input v-bind="props" type="range" v-model="wrapper" />
</template>
