<script setup lang="ts">
import ScaleControls from '@/components/ScaleControls.vue'
import TuningTable from '@/components/TuningTable.vue'
import { DEFAULT_NUMBER_OF_COMPONENTS } from '@/constants'
import { useScaleStore } from '@/stores/scale'
import { useStateStore } from '@/stores/state'
import { debounce } from '@/utils'
import { getSourceVisitor, setNumberOfComponents } from 'sonic-weave'
import { defineAsyncComponent, onMounted, onUnmounted, ref, shallowRef } from 'vue'

const scale = useScaleStore()
const state = useStateStore()

const controls = ref<typeof ScaleControls | null>(null)
const newScale = ref<{ blur?: () => void } | null>(null)
const modifyScale = ref<{ blur?: () => void } | null>(null)
const exporterButtons = ref<{ uploadScale?: () => void } | null>(null)
const isAuxiliaryPanelsLoaded = ref(false)

const NewScaleAsync = shallowRef()
const ModifyScaleAsync = shallowRef()
const ExporterButtonsAsync = defineAsyncComponent(() => import('@/components/ExporterButtons.vue'))

const updateScale = debounce(scale.computeScale)

onMounted(() => {
  // Initialize SonicWeave stdlib
  setNumberOfComponents(DEFAULT_NUMBER_OF_COMPONENTS)
  setTimeout(() => getSourceVisitor(), 1)

  const loadAuxiliaryPanels = () => {
    NewScaleAsync.value = defineAsyncComponent(() => import('@/components/NewScale.vue'))
    ModifyScaleAsync.value = defineAsyncComponent(() => import('@/components/ModifyScale.vue'))
    isAuxiliaryPanelsLoaded.value = true
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(loadAuxiliaryPanels, { timeout: 400 })
  } else {
    setTimeout(loadAuxiliaryPanels, 100)
  }
})

onUnmounted(() => {
  // Prepare to include other state in the server payload
  scale.rerollId()
})
</script>

<template>
  <main>
    <div class="columns-container">
      <div class="column scale-builder">
        <textarea
          id="scale-name"
          rows="1"
          placeholder="Untitled scale"
          v-model="scale.name"
          @focus="controls!.clearPaletteInfo"
          @input="updateScale()"
        ></textarea>
        <ul class="btn-group">
          <template v-if="isAuxiliaryPanelsLoaded">
            <component
              :is="NewScaleAsync"
              ref="newScale"
              @done="controls!.focus()"
              @mouseenter="modifyScale?.blur?.()"
            />
            <component
              :is="ModifyScaleAsync"
              ref="modifyScale"
              @done="controls!.focus()"
              @mouseenter="newScale?.blur?.()"
            />
          </template>
          <template v-else>
            <li class="skeleton-btn" aria-hidden="true"></li>
            <li class="skeleton-btn" aria-hidden="true"></li>
          </template>
        </ul>
        <ScaleControls ref="controls" />
      </div>
      <div class="column tuning-table">
        <TuningTable
          :heldNotes="state.heldNotes"
          :frequencies="scale.frequencies"
          :centsValues="scale.centsValues"
          :baseFrequency="scale.scale.baseFrequency"
          :baseMidiNote="scale.scale.baseMidiNote"
          :colors="scale.colors"
          :labels="scale.labels"
        />
      </div>
      <div class="column exporters" @mouseenter="exporterButtons?.uploadScale?.()">
        <Suspense>
          <component :is="ExporterButtonsAsync" ref="exporterButtons" />
          <template #fallback>
            <div class="exporter-skeleton" aria-hidden="true">
              <div class="skeleton-row"></div>
              <div class="skeleton-row"></div>
              <div class="skeleton-row"></div>
            </div>
          </template>
        </Suspense>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* Content layout (small) */
div.columns-container {
  height: 100%;
  overflow-y: auto;
  background-color: var(--color-border);
}
div.column {
  background-color: var(--color-background);
  overflow-x: hidden;
}
div.scale-builder {
  padding: 1rem;
}
div.tuning-table {
  padding: 0rem;
}
div.exporters {
  padding: 1rem;
}

/* Content layout (medium) */
@media screen and (min-width: 600px) {
  div.columns-container {
    column-count: 2;
    column-gap: 1px;
    overflow: hidden;
  }
  div.column {
    overflow-y: auto;
  }
  div.scale-builder {
    width: 100%;
    height: 100%;
  }
  div.tuning-table {
    width: 100%;
    height: 66%;
  }
  div.exporters {
    width: 100%;
    height: 34%;
    border-top: 1px solid var(--color-border);
  }
}

/* Content layout (large) */
@media screen and (min-width: 1100px) {
  div.columns-container {
    column-count: 3;
  }
  div.column {
    height: 100%;
  }
  div.exporters {
    border: none;
  }
}

/* UI elements */
#scale-name {
  width: 100%;
  font-size: 1.4em;
  margin-bottom: 1rem;
  padding: 0.3rem;
  font-family: sans-serif;
  resize: vertical;
}

select optgroup + optgroup {
  margin-top: 1em;
}

.real-valued:invalid {
  background-color: var(--color-background);
}

.skeleton-btn {
  height: 2.2rem;
  border-radius: 4px;
  background-color: var(--color-border);
  margin-bottom: 0.5rem;
  list-style: none;
}

.exporter-skeleton {
  display: grid;
  gap: 0.5rem;
}

.skeleton-row {
  height: 2rem;
  border-radius: 4px;
  background-color: var(--color-border);
}
</style>
