<script setup lang="ts">
import Modal from '@/components/ModalDialog.vue'
import KontaktExporter from '@/exporters/kontakt'
import type { ExporterParams } from '@/exporters/base'
import type { Scale } from '@/scale'
import { useExportStore } from '@/stores/export'
import { sanitizeFilename } from '@/utils'
import type { Interval } from 'sonic-weave'

const props = defineProps<{
  show: boolean
  newline: string
  midiOctaveOffset: number
  relativeIntervals: Interval[]
  scale: Scale
  labels: string[]
  scaleUrl: string
}>()

const store = useExportStore()

const emit = defineEmits(['confirm', 'cancel'])

function doExport() {
  const params: ExporterParams = {
    newline: props.newline,
    scale: props.scale,
    filename: sanitizeFilename(props.scale.title),
    midiOctaveOffset: props.midiOctaveOffset,
    relativeIntervals: props.relativeIntervals,
    labels: props.labels,
    scaleUrl: props.scaleUrl,
    remapKontaktSamples: store.remapKontaktSamples
  }

  const exporter = new KontaktExporter(params)
  exporter.saveFile()

  emit('confirm')
}
</script>

<template>
  <Modal :show="show" @confirm="doExport" @cancel="$emit('cancel')">
    <template #header>
      <h2>Export Kontakt tuning script</h2>
    </template>
    <template #body>
      <div class="control-group">
        <div class="control checkbox-container">
          <input type="checkbox" id="kontakt-remap" v-model="store.remapKontaktSamples" />
          <label for="kontakt-remap">Remap samples to prevent extreme retuning</label>
        </div>
      </div>
    </template>
  </Modal>
</template>
