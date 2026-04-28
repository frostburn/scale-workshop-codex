<script setup lang="ts">
import Modal from '@/components/ModalDialog.vue'
import { useModalStore } from '@/stores/modal'
import { useScaleStore } from '@/stores/scale'

defineProps<{
  show: boolean
}>()

const emit = defineEmits(['done', 'cancel'])

const modal = useModalStore()
const scale = useScaleStore()

function modify() {
  const divisions = Math.max(1, Math.round(Number(modal.interpolationDivisions) || 1))
  const method = modal.interpolateLinearly ? 'interpolateLinear' : 'interpolate'
  scale.sourceText += `\n${method}(${divisions})`
  scale.computeScale()
  emit('done')
}
</script>

<template>
  <Modal :show="show" @confirm="modify" @cancel="$emit('cancel')">
    <template #header>
      <h2>Interpolate scale</h2>
    </template>
    <template #body>
      <div class="control-group">
        <p>Insert interpolated notes between each adjacent pair of scale tones.</p>
        <div class="control">
          <label for="interpolation-divisions">Equal divisions</label>
          <input
            id="interpolation-divisions"
            type="number"
            min="1"
            step="1"
            v-model="modal.interpolationDivisions"
          />
        </div>
        <div class="control checkbox-container">
          <input type="checkbox" id="interpolate-linearly" v-model="modal.interpolateLinearly" />
          <label for="interpolate-linearly">Interpolate linearly</label>
        </div>
      </div>
    </template>
  </Modal>
</template>
